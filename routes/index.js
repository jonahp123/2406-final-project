const url = require('url');
const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('data/movie_db.sqlite');
const fetch = require('node-fetch');
require('dotenv').config();
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// Initialize database tables
db.serialize(function() {
  // Users table with role field
  let sqlString = "CREATE TABLE IF NOT EXISTS users (userid TEXT PRIMARY KEY, password TEXT, role TEXT DEFAULT 'guest')";
  db.run(sqlString);
  
  // Add admin user if not exists
  const admin = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  sqlString = "INSERT OR IGNORE INTO users VALUES (?, ?, 'admin')";
  db.run(sqlString, [admin, adminPass]);
  
  // Movies table to store movie details
  sqlString = "CREATE TABLE IF NOT EXISTS movies (id TEXT PRIMARY KEY, title TEXT, year TEXT, poster TEXT, plot TEXT)";
  db.run(sqlString);
  
  // Reviews table
  sqlString = "CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, movieId TEXT, userId TEXT, review TEXT, date TEXT, FOREIGN KEY(userId) REFERENCES users(userid), FOREIGN KEY(movieId) REFERENCES movies(id))";
  db.run(sqlString);
  
  // Ratings table
  sqlString = "CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY AUTOINCREMENT, movieId TEXT, userId TEXT, rating INTEGER, FOREIGN KEY(userId) REFERENCES users(userid), FOREIGN KEY(movieId) REFERENCES movies(id))";
  db.run(sqlString);
});

exports.authenticate = function(request, response, next) {
  // Skip authentication for certain paths
  const publicPaths = ['/login', '/register', '/public', '/favicon.ico', '/logout'];
  
  for (const path of publicPaths) {
    if (request.path.startsWith(path)) {
      return next();
    }
  }
  
  const auth = request.headers.authorization;
  
  // Auth is a base64 representation of (username:password)
  // So we will need to decode the base64
  if (!auth) {
    // Note here the setHeader must be before the writeHead
    response.setHeader('WWW-Authenticate', 'Basic realm="Movie Recommendation Hub"');
    response.writeHead(401, {'Content-Type': 'text/html'});
    console.log('No authorization found, send 401.');
    response.end();
  } else {
    console.log("Authorization Header: " + auth);
    // Decode authorization header
    // Split on a space, the original auth
    // Looks like "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
    const tmp = auth.split(' ');

    // Create a buffer and tell it the data coming in is base64
    const buf = Buffer.from(tmp[1], 'base64');

    // Read it back out as a string
    // Should look like 'userid:password'
    const plain_auth = buf.toString();
    console.log("Decoded Authorization ", plain_auth);

    // Extract the userid and password as separate strings
    const credentials = plain_auth.split(':');      // Split on a ':'
    const username = credentials[0];
    const password = credentials[1];
    console.log("User: ", username);
    console.log("Password: ", password);

    let authorized = false;
    // Check database users table for user
    db.all("SELECT userid, password, role FROM users", function(err, rows) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].userid == username && rows[i].password == password) {
          authorized = true;
          // Attach user info to request for later use
          request.user = {
            userid: rows[i].userid,
            role: rows[i].role
          };
        }
      }
      
      if (authorized == false) {
        // We had an authorization header by the user:password is not valid
        response.setHeader('WWW-Authenticate', 'Basic realm="Movie Recommendation Hub"');
        response.writeHead(401, {'Content-Type': 'text/html'});
        console.log('Invalid credentials, send 401.');
        response.end();
      } else {
        next();
      }
    });
  }
}

function parseURL(request, response) {
  const parseQuery = true; // parseQueryStringIfTrue
  const slashHost = true;  // slashDenoteHostIfTrue
  const urlObj = url.parse(request.url, parseQuery, slashHost);
  console.log('path:');
  console.log(urlObj.path);
  console.log('query:');
  console.log(urlObj.query);
  return urlObj;
}

exports.index = function(request, response) {
  // Get latest reviews to display on homepage
  const sql = "SELECT reviews.*, movies.title, movies.poster, users.userid FROM reviews JOIN movies ON reviews.movieId = movies.id JOIN users ON reviews.userId = users.userid ORDER BY reviews.date DESC LIMIT 5";
  
  db.all(sql, function(err, reviews) {
    // Get top rated movies
    const ratingsSql = "SELECT movies.*, AVG(ratings.rating) as avgRating FROM movies JOIN ratings ON movies.id = ratings.movieId GROUP BY movies.id ORDER BY avgRating DESC LIMIT 5";
    
    db.all(ratingsSql, function(err, topMovies) {
      response.render('index', { 
        title: 'Movie Recommendation Hub',
        user: request.user,
        reviews: reviews,
        topMovies: topMovies
      });
    });
  });
}

exports.loginPage = function(request, response) {
  response.render('login', { title: 'Login' });
}

exports.registerPage = function(request, response) {
  response.render('register', { title: 'Register' });
}

exports.registerUser = function(request, response) {
  const username = request.body.username;
  const password = request.body.password;
  
  // Check if user already exists
  db.get("SELECT userid FROM users WHERE userid = ?", [username], function(err, row) {
    if (row) {
      // User already exists
      response.render('register', { 
        title: 'Register',
        error: 'Username already exists. Please choose another one.'
      });
    } else {
      // Create new user
      const sql = "INSERT INTO users (userid, password, role) VALUES (?, ?, 'guest')";
      db.run(sql, [username, password], function(err) {
        if (err) {
          response.render('register', { 
            title: 'Register',
            error: 'Error creating account. Please try again.'
          });
        } else {
          response.render('login', { 
            title: 'Login',
            message: 'Account created successfully. Please login.'
          });
        }
      });
    }
  });
}

exports.search = function(request, response) {
  const urlObj = parseURL(request, response);
  const searchTitle = urlObj.query.title || '';
  
  if (searchTitle) {
    // Fetch movie search results from OMDB API
    fetch(`http://www.omdbapi.com/?s=${encodeURIComponent(searchTitle)}&apikey=${OMDB_API_KEY}`)
      .then(res => res.json())
      .then(data => {
        response.render('search', {
          title: 'Search Results',
          user: request.user,
          searchTerm: searchTitle,
          results: data.Search || [],
          error: data.Error
        });
      })
      .catch(err => {
        response.render('search', {
          title: 'Search Results',
          user: request.user,
          searchTerm: searchTitle,
          error: 'Error connecting to movie database'
        });
      });
  } else {
    response.render('search', {
      title: 'Search Movies',
      user: request.user
    });
  }
}

exports.movieDetails = function(request, response) {
  const movieId = request.params.id;
  
  // Fetch movie details from OMDB API
  fetch(`http://www.omdbapi.com/?i=${movieId}&plot=full&apikey=${OMDB_API_KEY}`)
    .then(res => res.json())
    .then(movieData => {
      if (movieData.Response === 'True') {
        // Store movie in database if not already there
        const checkSql = "SELECT * FROM movies WHERE id = ?";
        db.get(checkSql, [movieId], function(err, movie) {
          if (!movie) {
            const insertSql = "INSERT INTO movies (id, title, year, poster, plot) VALUES (?, ?, ?, ?, ?)";
            db.run(insertSql, [movieId, movieData.Title, movieData.Year, movieData.Poster, movieData.Plot]);
          }
          
          // Get reviews for this movie with their ratings
          const reviewsSql = `
            SELECT reviews.*, users.userid, ratings.rating 
            FROM reviews 
            JOIN users ON reviews.userId = users.userid 
            LEFT JOIN ratings ON ratings.userId = reviews.userId AND ratings.movieId = reviews.movieId
            WHERE reviews.movieId = ? 
            ORDER BY date DESC`;
          
          db.all(reviewsSql, [movieId], function(err, reviews) {
            
            // Get average rating
            const ratingSql = "SELECT AVG(rating) as avgRating FROM ratings WHERE movieId = ?";
            db.get(ratingSql, [movieId], function(err, ratingData) {
              
              // Check if current user has rated this movie
              const userRatingSql = "SELECT rating FROM ratings WHERE movieId = ? AND userId = ?";
              db.get(userRatingSql, [movieId, request.user ? request.user.userid : null], function(err, userRating) {
                
                response.render('movieDetails', {
                  title: movieData.Title,
                  user: request.user,
                  movie: movieData,
                  reviews: reviews,
                  avgRating: ratingData ? ratingData.avgRating : 0,
                  userRating: userRating ? userRating.rating : 0
                });
              });
            });
          });
        });
      } else {
        response.render('error', {
          title: 'Movie Not Found',
          error: movieData.Error || 'Movie not found'
        });
      }
    })
    .catch(err => {
      response.render('error', {
        title: 'Error',
        error: 'Error fetching movie details'
      });
    });
}

exports.users = function(request, response) {
  // Check if user has admin privileges
  if (request.user.role !== 'admin') {
    // Return an error response if not admin
    response.render('error', {
      title: 'Access Denied',
      error: 'You need admin privileges to view user information.'
    });
    return;
  }
  
  // If user is admin, proceed with showing users
  db.all("SELECT userid, password, role FROM users", function(err, rows) {
    response.render('users', {
      title: 'User Management',
      user: request.user,
      userEntries: rows
    });
  });
}

exports.userProfile = function(request, response) {
  // Get user's reviews
  const reviewsSql = "SELECT reviews.*, movies.title, movies.poster FROM reviews JOIN movies ON reviews.movieId = movies.id WHERE userId = ? ORDER BY date DESC";
  
  db.all(reviewsSql, [request.user.userid], function(err, reviews) {
    // Get user's ratings
    const ratingsSql = "SELECT ratings.*, movies.title, movies.poster FROM ratings JOIN movies ON ratings.movieId = movies.id WHERE userId = ?";
    
    db.all(ratingsSql, [request.user.userid], function(err, ratings) {
      response.render('profile', {
        title: 'Your Profile',
        user: request.user,
        reviews: reviews,
        ratings: ratings
      });
    });
  });
}

exports.logout = function(request, response) {
  // For HTTP Basic Auth, we need to send a 401 to clear auth credentials
  response.setHeader('WWW-Authenticate', 'Basic realm="Movie Recommendation Hub"');
  response.status(401).render('logout', { 
    title: 'Logout',
    message: 'You have been logged out successfully.'
  });
}
