from django.urls import path
from . import views

urlpatterns = [
    # =========================
    # Authentication
    # =========================
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),

    # =========================
    # Main pages
    # =========================
    path('', views.home, name='home'),               # Public landing page
    path('homepage/', views.homepage, name='homepage'),
    path('adminpanel/', views.adminpanel, name='adminpanel'),
    path('home/', views.home_view, name='home'),

    # =========================
    # Traditional borrow/return (non-AJAX)
    # =========================
    path('borrow/<int:book_id>/', views.borrow_book, name='borrow_book'),
    path('return/<int:borrow_id>/', views.return_book, name='return_book'),

    # =========================
    # AJAX endpoints for modal borrow/return
    # =========================
    path('api/borrow/<int:book_id>/', views.borrow_book_ajax, name='borrow_book_ajax'),
    path('api/return/<int:book_id>/', views.return_book_ajax, name='return_book_ajax'),
    path('api/check-borrow/<int:book_id>/', views.check_borrow_status, name='check_borrow_status'),
    path('api/my-books-count/', views.my_books_count, name='my_books_count'),

    # Endpoint to mark "My Books" tab as visited (for badge)
    path('api/visited-mybooks/', views.mark_mybooks_visited, name='mark_mybooks_visited'),

    # =========================
    # Admin book management
    # =========================
    path('add-book/', views.add_book, name='add_book'),
    path('delete-book/<int:id>/', views.delete_book, name='delete_book'),

    # =========================
    # Borrowed books API
    # =========================
    path('api/borrowed-books/', views.api_borrowed_books, name='api_borrowed_books'),

    # =========================
    # Rating & review
    # =========================
    path('rate/<int:book_id>/<int:value>/', views.rate_book, name='rate_book'),
    path('api/submit-review/', views.submit_review, name='submit_review'),
    path('api/book-feedback/<int:book_id>/', views.book_feedback, name='book_feedback'),

    path('set-due-date/<int:borrow_id>/', views.set_due_date, name='set_due_date'),
]
