document.addEventListener('DOMContentLoaded', () => {
  // Handle logout link click
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      
      // Clear credentials and redirect to logout page
      // This will force the browser to forget the stored credentials
      try {
        // Set random invalid credentials
        const invalidCreds = btoa(`logout:${Date.now()}`);
        
        // Make a fetch request with invalid credentials to clear auth
        await fetch('/logout', {
          headers: {
            'Authorization': `Basic ${invalidCreds}`
          }
        });
        
        // Redirect to logout page
        window.location.href = '/logout';
      } catch (error) {
        console.error('Logout error:', error);
        // Still try to redirect to logout page
        window.location.href = '/logout';
      }
    });
  }
  
  // Handle search form submission
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const searchTerm = document.getElementById('search-input').value.trim();
      if (searchTerm) {
        window.location.href = `/search?title=${encodeURIComponent(searchTerm)}`;
      }
    });
  }
  
  // Handle rating submissions
  const ratingForm = document.getElementById('rating-form');
  if (ratingForm) {
    ratingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const movieId = document.getElementById('movie-id').value;
      const ratingValue = document.querySelector('input[name="rating"]:checked').value;
      
      try {
        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ movieId, rating: parseInt(ratingValue) })
        });
        
        const data = await response.json();
        if (response.ok) {
          // Show success message
          const ratingMessage = document.getElementById('rating-message');
          ratingMessage.textContent = 'Rating submitted successfully!';
          ratingMessage.classList.add('success');
          
          // Update average rating display
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        const ratingMessage = document.getElementById('rating-message');
        ratingMessage.textContent = error.message || 'Error submitting rating';
        ratingMessage.classList.add('error');
      }
    });
  }
  
  // Handle review submissions
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const movieId = document.getElementById('movie-id').value;
      const reviewText = document.getElementById('review-text').value.trim();
      
      if (!reviewText) {
        const reviewMessage = document.getElementById('review-message');
        reviewMessage.textContent = 'Please enter a review';
        reviewMessage.classList.add('error');
        return;
      }
      
      try {
        // First check if user has rated this movie
        const checkRatingResponse = await fetch(`/api/ratings/check/${movieId}`, {
          method: 'GET'
        });
        
        const ratingData = await checkRatingResponse.json();
        
        if (!ratingData.hasRating) {
          const reviewMessage = document.getElementById('review-message');
          reviewMessage.textContent = 'You must rate this movie before submitting a review';
          reviewMessage.classList.add('error');
          return;
        }
        
        // If user has rated, proceed with submitting the review
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ movieId, review: reviewText })
        });
        
        const data = await response.json();
        if (response.ok) {
          // Show success message
          const reviewMessage = document.getElementById('review-message');
          reviewMessage.textContent = 'Review submitted successfully!';
          reviewMessage.classList.add('success');
          
          // Clear the form
          document.getElementById('review-text').value = '';
          
          // Reload to show the new review
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        const reviewMessage = document.getElementById('review-message');
        reviewMessage.textContent = error.message || 'Error submitting review';
        reviewMessage.classList.add('error');
      }
    });
  }
  
  // Handle review deletion
  const deleteButtons = document.querySelectorAll('.delete-review');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      if (confirm('Are you sure you want to delete this review?')) {
        const reviewId = button.dataset.reviewId;
        
        try {
          const response = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          if (response.ok) {
            // Remove the review from the DOM
            const reviewElement = button.closest('.review-item');
            reviewElement.remove();
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          alert(error.message || 'Error deleting review');
        }
      }
    });
  });
  
  // Handle rating deletion
  const deleteRatingButtons = document.querySelectorAll('.delete-rating');
  deleteRatingButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault(); // Prevent navigating to the movie page
      event.stopPropagation(); // Stop event from bubbling up
      
      if (confirm('Are you sure you want to remove this rating? This will also delete any reviews you wrote for this movie.')) {
        const ratingId = button.dataset.ratingId;
        
        try {
          const response = await fetch(`/api/ratings/${ratingId}`, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          if (response.ok) {
            // Remove the rating card from the DOM
            const ratingElement = button.closest('.movie-card');
            ratingElement.remove();
            
            // Also remove any associated review items
            const reviewItems = document.querySelectorAll('.review-item');
            reviewItems.forEach(item => {
              if (item.querySelector(`[data-review-movie-id="${ratingElement.dataset.movieId}"]`)) {
                item.remove();
              }
            });
            
            // If no more ratings, show the "no ratings" message
            const ratingsGrid = document.querySelector('.movies-grid');
            if (ratingsGrid && ratingsGrid.children.length === 0) {
              const ratingsSection = ratingsGrid.parentElement;
              ratingsSection.innerHTML = '<p>You haven\'t rated any movies yet.</p>';
            }
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          alert(error.message || 'Error removing rating');
        }
      }
    });
  });
});
