from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta
from django.utils import timezone

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    category = models.CharField(max_length=100, default="Unknown")
    pages = models.IntegerField(default=0)
    year = models.IntegerField(default=2000)
    cover_url = models.URLField(default="https://via.placeholder.com/150")
    description = models.TextField(blank=True)

    available = models.BooleanField(default=True)

    # ⭐ ADD THIS (PERMANENT COUNTER)
    total_borrows = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.title

def default_due_date():
    return timezone.now() + timedelta(days=7)

class Borrow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)

    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(default=default_due_date)  # ✅ FIXED

    returned = models.BooleanField(default=False)

    note = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.book.title}"
    
class Rating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()
    feedback = models.TextField(blank=True)  # ✅ ADD THIS
    created_at = models.DateTimeField(auto_now_add=True)

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey('Book', on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.book.title} ({self.rating})"