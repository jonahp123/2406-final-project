/*
Movie Recommendation Hub
A web application where users can search for movies, read and write reviews,
and keep track of their favorite movies.

The app uses the OMDb API to fetch movie details and stores user reviews
and ratings in a SQLite database.

This is an Express application using Handlebars for template rendering.
*/

const http = require('http');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const fs = require('fs');
const hbs = require('hbs');
require('dotenv').config();

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Register Handlebars helpers
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

// Helper to display stars for ratings
hbs.registerHelper('stars', function(rating) {
  let stars = '';
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < fullStars; i++) {
    stars += '★';
  }
  
  if (halfStar) {
    stars += '½';
  }
  
  return new hbs.SafeString(stars);
});

// Load routes
const routes = require('./routes/index');
const apiRoutes = require('./routes/api');

const app = express(); // Create express middleware dispatcher

const PORT = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs'); // Use hbs handlebars wrapper

app.locals.pretty = true; // To generate pretty view-source code in browser

// Register middleware with dispatcher
// ORDER MATTERS HERE
// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(routes.authenticate); // Authenticate user
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));

// Routes
app.get('/', routes.index);
app.get('/index.html', routes.index);
app.get('/login', routes.loginPage);
app.get('/register', routes.registerPage);
app.post('/register', routes.registerUser);
app.get('/search', routes.search);
app.get('/movie/:id', routes.movieDetails);
app.get('/users', routes.users);
app.get('/profile', routes.userProfile);
app.get('/logout', routes.logout);

// API routes
app.get('/api/movies', apiRoutes.searchMovies);
app.get('/api/movie/:id', apiRoutes.getMovieDetails);
app.post('/api/reviews', apiRoutes.addReview);
app.get('/api/reviews/:movieId', apiRoutes.getReviews);
app.post('/api/ratings', apiRoutes.addRating);
app.delete('/api/reviews/:id', apiRoutes.deleteReview);
app.delete('/api/ratings/:id', apiRoutes.deleteRating);
app.get('/api/ratings/check/:movieId', apiRoutes.checkUserRating); // Add this new route

// Start server
app.listen(PORT, err => {
  if(err) console.log(err);
  else {
    console.log(`Server listening on port: ${PORT} CNTL:-C to stop`);
    console.log(`To Test:`);
    console.log('Default admin: admin password: admin123');
    console.log('All links are just for testing purposes, if you want to run the website as it is intended visit register page');
    console.log('http://localhost:3000/');
    console.log('http://localhost:3000/login');
    console.log('http://localhost:3000/register');
    console.log('http://localhost:3000/search?title=Avengers');
    console.log('http://localhost:3000/users (admin only)');
  }
});
