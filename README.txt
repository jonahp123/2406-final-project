MOVIE RECOMMENDATION HUB

AFFIDAVIT:
I attest to be the sole author of this submitted work and any code borrowed from other sources has been identified by comments placed in my submitted code.
Jonah Pasquantonio, 101326414

INSTALL INSTRUCTIONS:
1. Extract the files to your preferred location
2. Open a terminal/command prompt in the project directory
3. Run: npm install

LAUNCH INSTRUCTIONS:
1. Run: node server.js
2. The server will start on port 3000
3. Navigate to http://localhost:3000/register in your web browser to get the proper experience
4. click the login button below the register information
5. log in with the username: "admin" and the password "admin123"

VIDEO DEMONSTRATION:
YouTube Link: https://youtu.be/Gy25sulu11c
   - demonstrates how to run program just in case testing instructions are unclear


TESTING INSTRUCTIONS:
1. Use the admin account to test admin features:
   - Username: admin
   - Password: admin123
   
2. Register a new guest account to test guest features (or in sqlite 3 command terminal, see below):
   important note: if you log out you will be redirected to the log out page where you then need to press cancel twice to view the page. if confused please see video.
   - Click on "Register" in the navigation
   - Fill in the registration form
   
3. Test features:
   - Search for movies using the search bar
   - View movie details by clicking on a movie
   - Rate movies and write reviews when logged in
   - Admin can view all users via the Users page
   - Logout when you're done by clicking "Logout" in the navigation

FEATURES IMPLEMENTED:
1. User Authentication
   - Basic HTTP authentication
   - User registration for guest accounts
   - Admin privileges for user management
   - Logout functionality

2. Movie Data
   - Integration with OMDb API for movie information
   - Search functionality
   - Detailed movie views

3. User Contributions
   - Movie ratings (1-5 stars)
   - Movie reviews
   - Profile page to view your ratings and reviews

4. Admin Features
   - Access to view all users in the system

5. Database
   - SQLite database for storing users, reviews, and ratings
   - Persistent storage of user contributions

6. Single-Page Functionality
   - Client-side JavaScript for form handling
   - Dynamic content updates without page reloads

TECHNOLOGIES USED:
- Node.js with Express
- Handlebars templating
- SQLite database
- OMDb API for movie data
- JavaScript for client-side functionality

USEFUL DATABASE COMMANDS:
To access the database directly, open a terminal and run:
> sqlite3 data/movie_db.sqlite

Common SQLite commands:
1. View all users:
   > SELECT * FROM users;

2. Add a new user:
   > INSERT INTO users (userid, password, role) VALUES ('username', 'password', 'guest');

3. Add an admin user:
   > INSERT INTO users (userid, password, role) VALUES ('newadmin', 'password', 'admin');

4. Delete a user:
   > DELETE FROM users WHERE userid = 'username';

5. View all reviews:
   > SELECT reviews.*, users.userid FROM reviews JOIN users ON reviews.userId = users.userid;

6. View all ratings:
   > SELECT ratings.*, users.userid, movies.title FROM ratings 
     JOIN users ON ratings.userId = users.userid 
     JOIN movies ON ratings.movieId = movies.id;

7. Delete a review:
   > DELETE FROM reviews WHERE id = [review_id];

8. Exit SQLite:
   > .exit
