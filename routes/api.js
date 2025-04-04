const url = require('url');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/movie_db.sqlite');
const fetch = require('node-fetch');
require('dotenv').config();
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// API route to search for movies
exports.searchMovies = function(request, response) {
  const urlObj = url.parse(request.url, true);
  const title = urlObj.query.title || '';
  
  if (!title) {
    return response.status(400).json({ error: 'Title parameter is required' });
  }
  
  // Fetch from OMDB API
  fetch(`http://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      response.json(data);
    })
    .catch(err => {
      response.status(500).json({ error: 'Error fetching movie data' });
    });
};

// API route to get movie details
exports.getMovieDetails = function(request, response) {
  const movieId = request.params.id;
  
  if (!movieId) {
    return response.status(400).json({ error: 'Movie ID is required' });
  }
  
  // Fetch from OMDB API
  fetch(`http://www.omdbapi.com/?i=${movieId}&plot=full&apikey=${OMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.Response === 'True') {
        // Store movie in database if not already there
        const checkSql = "SELECT * FROM movies WHERE id = ?";
        db.get(checkSql, [movieId], function(err, movie) {
          if (!movie) {
            const insertSql = "INSERT INTO movies (id, title, year, poster, plot) VALUES (?, ?, ?, ?, ?)";
            db.run(insertSql, [movieId, data.Title, data.Year, data.Poster, data.Plot]);
          }
          response.json(data);
        });
      } else {
        response.status(404).json({ error: data.Error || 'Movie not found' });
      }
    })
    .catch(err => {
      response.status(500).json({ error: 'Error fetching movie details' });
    });
};

// New API route to check if user has rated a movie
exports.checkUserRating = function(request, response) {
  const movieId = request.params.movieId;
  const userId = request.user.userid;
  
  if (!movieId) {
    return response.status(400).json({ error: 'Movie ID is required' });
  }
  
  const sql = "SELECT id, rating FROM ratings WHERE movieId = ? AND userId = ?";
  db.get(sql, [movieId, userId], function(err, rating) {
    if (err) {
      return response.status(500).json({ error: 'Error checking rating' });
    }
    
    response.json({
      hasRating: !!rating,
      rating: rating ? rating.rating : null
    });
  });
};

// API route to add a review
exports.addReview = function(request, response) {
  const { movieId, review } = request.body;
  const userId = request.user.userid;
  const date = new Date().toISOString();
  
  if (!movieId || !review) {
    return response.status(400).json({ error: 'Movie ID and review text are required' });
  }
  
  // First check if user has rated this movie
  const checkSql = "SELECT id FROM ratings WHERE movieId = ? AND userId = ?";
  db.get(checkSql, [movieId, userId], function(err, rating) {
    if (err) {
      return response.status(500).json({ error: 'Error checking rating' });
    }
    
    if (!rating) {
      return response.status(400).json({ error: 'You must rate this movie before submitting a review' });
    }
    
    // User has a rating, proceed with adding the review
    const sql = "INSERT INTO reviews (movieId, userId, review, date) VALUES (?, ?, ?, ?)";
    db.run(sql, [movieId, userId, review, date], function(err) {
      if (err) {
        return response.status(500).json({ error: 'Error saving review' });
      }
      
      response.json({
        id: this.lastID,
        movieId,
        userId,
        review,
        date
      });
    });
  });
};

// API route to get reviews for a movie
exports.getReviews = function(request, response) {
  const movieId = request.params.movieId;
  
  if (!movieId) {
    return response.status(400).json({ error: 'Movie ID is required' });
  }
  
  const sql = "SELECT reviews.*, users.userid FROM reviews JOIN users ON reviews.userId = users.userid WHERE movieId = ? ORDER BY date DESC";
  db.all(sql, [movieId], function(err, reviews) {
    if (err) {
      return response.status(500).json({ error: 'Error fetching reviews' });
    }
    
    response.json(reviews);
  });
};

// API route to add a rating
exports.addRating = function(request, response) {
  const { movieId, rating } = request.body;
  const userId = request.user.userid;
  
  if (!movieId || !rating || rating < 1 || rating > 5) {
    return response.status(400).json({ error: 'Movie ID and valid rating (1-5) are required' });
  }
  
  // Check if user already rated this movie
  const checkSql = "SELECT id FROM ratings WHERE movieId = ? AND userId = ?";
  db.get(checkSql, [movieId, userId], function(err, existingRating) {
    if (existingRating) {
      // Update existing rating
      const updateSql = "UPDATE ratings SET rating = ? WHERE id = ?";
      db.run(updateSql, [rating, existingRating.id], function(err) {
        if (err) {
          return response.status(500).json({ error: 'Error updating rating' });
        }
        
        response.json({
          id: existingRating.id,
          movieId,
          userId,
          rating
        });
      });
    } else {
      // Add new rating
      const insertSql = "INSERT INTO ratings (movieId, userId, rating) VALUES (?, ?, ?)";
      db.run(insertSql, [movieId, userId, rating], function(err) {
        if (err) {
          return response.status(500).json({ error: 'Error saving rating' });
        }
        
        response.json({
          id: this.lastID,
          movieId,
          userId,
          rating
        });
      });
    }
  });
};

// API route to delete a review
exports.deleteReview = function(request, response) {
  const reviewId = request.params.id;
  const userId = request.user.userid;
  
  if (!reviewId) {
    return response.status(400).json({ error: 'Review ID is required' });
  }
  
  // Check if user is the author of the review or an admin
  if (request.user.role === 'admin') {
    // Admin can delete any review
    const sql = "DELETE FROM reviews WHERE id = ?";
    db.run(sql, [reviewId], function(err) {
      if (err) {
        return response.status(500).json({ error: 'Error deleting review' });
      }
      
      response.json({ success: true, message: 'Review deleted successfully' });
    });
  } else {
    // Regular users can only delete their own reviews
    const sql = "DELETE FROM reviews WHERE id = ? AND userId = ?";
    db.run(sql, [reviewId, userId], function(err) {
      if (err || this.changes === 0) {
        return response.status(403).json({ error: "You can only delete your own reviews" });
      }
      
      response.json({ success: true, message: 'Review deleted successfully' });
    });
  }
};

// API route to delete a rating
exports.deleteRating = function(request, response) {
  const ratingId = request.params.id;
  const userId = request.user.userid;
  
  if (!ratingId) {
    return response.status(400).json({ error: 'Rating ID is required' });
  }
  
  // First, get the movieId for this rating to use when deleting associated reviews
  const getRatingSql = "SELECT movieId, userId FROM ratings WHERE id = ?";
  db.get(getRatingSql, [ratingId], function(err, ratingData) {
    if (err) {
      return response.status(500).json({ error: 'Error getting rating details' });
    }
    
    if (!ratingData) {
      return response.status(404).json({ error: 'Rating not found' });
    }
    
    // Check if user is the author of the rating or an admin
    if (request.user.role === 'admin' || ratingData.userId === userId) {
      // Begin transaction to ensure both operations succeed or fail together
      db.serialize(function() {
        db.run("BEGIN TRANSACTION");
        
        // Delete associated reviews first
        const deleteReviewSql = "DELETE FROM reviews WHERE movieId = ? AND userId = ?";
        db.run(deleteReviewSql, [ratingData.movieId, ratingData.userId], function(err) {
          if (err) {
            db.run("ROLLBACK");
            return response.status(500).json({ error: 'Error deleting associated reviews' });
          }
          
          // Then delete the rating
          const deleteRatingSql = "DELETE FROM ratings WHERE id = ?";
          db.run(deleteRatingSql, [ratingId], function(err) {
            if (err) {
              db.run("ROLLBACK");
              return response.status(500).json({ error: 'Error deleting rating' });
            }
            
            db.run("COMMIT");
            response.json({ 
              success: true, 
              message: 'Rating and associated reviews deleted successfully' 
            });
          });
        });
      });
    } else {
      response.status(403).json({ error: "You can only delete your own ratings" });
    }
  });
};
