# Movie Recommendation Hub

A web application where users can search for movies, read and write reviews, and keep track of their favorite movies.

## Features

- User authentication with admin and guest roles
- Movie search powered by OMDb API
- Movie details, ratings, and reviews
- Profile pages to track your ratings and reviews
- Admin user management

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/YourUsername/movie-recommendation-hub.git
   cd movie-recommendation-hub
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root with your OMDb API key:
   ```
   OMDB_API_KEY=your_api_key_here
   ```

4. Initialize the database (this happens automatically on first run)

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Default admin credentials:
   - Username: admin
   - Password: admin123

## Testing Instructions

1. Use the admin account to test admin features:
   - Username: admin
   - Password: admin123
   
2. Register a new guest account to test guest features
   - Click on "Register" in the navigation
   - Fill in the registration form
   
3. Test features:
   - Search for movies using the search bar
   - View movie details by clicking on a movie
   - Rate movies and write reviews when logged in
   - Admin can view all users via the Users page

## Technologies Used

- Node.js with Express
- Handlebars templating
- SQLite database
- OMDb API for movie data
- JavaScript for client-side functionality

## Database Information

The application uses SQLite for data storage. To access the database directly:

```
sqlite3 data/movie_db.sqlite
```

Common queries:
```sql
-- View all users
SELECT * FROM users;

-- View all reviews
SELECT reviews.*, users.userid FROM reviews 
JOIN users ON reviews.userId = users.userid;

-- View all ratings
SELECT ratings.*, users.userid, movies.title FROM ratings 
JOIN users ON ratings.userId = users.userid 
JOIN movies ON ratings.movieId = movies.id;
```


