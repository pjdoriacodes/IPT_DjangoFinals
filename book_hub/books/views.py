from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Book, Borrow, Rating
from django.core.serializers import serialize
from django.db.models import Count, Avg, Q
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.dateparse import parse_date
from .models import Review
import json

def book_feedback(request, book_id):
    reviews = Review.objects.filter(book_id=book_id)

    data = []
    for r in reviews:
        data.append({
            "user": r.user.username,
            "rating": r.rating,
            "feedback": r.feedback
        })

    return JsonResponse({"reviews": data})

# =========================
# PUBLIC LANDING PAGE
# =========================
def home(request):
    """Landing page accessible to anyone"""
    return render(request, 'home.html')


# =========================
# USER DASHBOARD
# =========================
@login_required(login_url='login')
def homepage(request):
    """Logged-in user dashboard with catalog and borrowed books"""
    books = Book.objects.annotate(
        avg_rating=Avg('reviews__rating')
        )
    categories = Book.objects.values_list('category', flat=True).distinct()

    borrowed_books = Borrow.objects.filter(user=request.user, returned=False).select_related('book')
    borrowed_count = borrowed_books.count()

    # Badge logic: show badge only if user hasn't visited My Books tab yet
    visited_mybooks = request.session.get('visited_mybooks', False)
    show_badge = borrowed_count > 0 and not visited_mybooks

    context = {
        'books': books,
        'categories': categories,
        'borrowed_books': borrowed_books,
        'borrowed_count': borrowed_count,
        'show_badge': show_badge,
    }

    return render(request, 'homepage.html', context)


# =========================
# MARK MY BOOKS VISITED (AJAX)
# =========================
@csrf_exempt
@login_required
def mark_mybooks_visited(request):
    if request.method == "POST":
        request.session['visited_mybooks'] = True
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)


# =========================
# AUTHENTICATION
# =========================
def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)

            # ✅ Decide redirect target
            if user.is_staff:
                redirect_url = '/adminpanel/'
            else:
                redirect_url = '/homepage/'

            return render(request, 'login.html', {
                'login_success': True,
                'redirect_url': redirect_url
            })

        else:
            messages.error(request, "Invalid login credentials")

    return render(request, 'login.html')


# views.py
def signup_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        # Check passwords match
        if password != confirm_password:
            messages.error(request, "Passwords do not match")
            return render(request, 'signup.html')

        # Check if username exists
        if not User.objects.filter(username=username).exists():
            User.objects.create_user(username=username, password=password)
            return render(request, 'signup.html', {
                'sign_success': True,
                'redirect_url': '/home/'  # JS will redirect after modal
            })
        else:
            messages.error(request, "Username already exists")

    return render(request, 'signup.html')


@login_required
def logout_view(request):
    logout(request)
    return redirect('home')


# =========================
# AJAX BORROW / RETURN
# =========================
@login_required
def check_borrow_status(request, book_id):
    book = get_object_or_404(Book, id=book_id)

    borrow = Borrow.objects.filter(book=book, returned=False).first()

    if borrow:
        return JsonResponse({
            "is_borrowed": True,
            "borrowed_by_user": request.user == borrow.user,
            "borrowed_by_username": borrow.user.username
        })
    else:
        return JsonResponse({
            "is_borrowed": False,
            "borrowed_by_user": False
        })
# =========================
# AJAX BORROW / RETURN (UPDATED)
# =========================
@login_required
@csrf_exempt
def borrow_book_ajax(request, book_id):
    if request.method == 'POST':
        book = get_object_or_404(Book, id=book_id)

        if not book.available:
            return JsonResponse({'success': False, 'error': 'Book already borrowed'}, status=400)

        try:
            # ✅ READ JSON BODY
            data = json.loads(request.body)

            due_date = data.get("return_date")
            note = data.get("note")

            parsed_date = parse_date(due_date) if due_date else None

            # ✅ PREVENT DUPLICATE
            existing = Borrow.objects.filter(
                user=request.user,
                book=book,
                returned=False
            ).first()

            if existing:
                return JsonResponse({'success': False, 'error': 'Already borrowed'})

            # ✅ CREATE ONLY ONCE
            Borrow.objects.create(
                user=request.user,
                book=book,
                due_date=parsed_date,
                note=note
            )

            # ✅ UPDATE BOOK
            book.available = False
            book.total_borrows += 1
            book.save()

            return JsonResponse({'success': True, 'action': 'borrowed'})

        except Exception as e:
            print("ERROR:", e)  # 🔥 CHECK TERMINAL
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

@csrf_exempt
@login_required
def set_due_date(request, borrow_id):
    if request.method == "POST":
        borrow = get_object_or_404(Borrow, id=borrow_id)

        due_date = request.POST.get("due_date") or request.POST.get("return_date")

        if due_date:
            borrow.due_date = due_date
            borrow.save()

        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)
@login_required
@csrf_exempt
def return_book_ajax(request, book_id):
    print("AJAX return called for book_id:", book_id)
    if request.method == 'POST':
        borrow = Borrow.objects.filter(user=request.user, book_id=book_id, returned=False).first()
        if borrow:
            borrow.returned = True
            borrow.book.available = True
            borrow.book.save()
            borrow.save()
            print("Book returned successfully")
            return JsonResponse({'success': True, 'action': 'returned'})
        else:
            print("Borrow record not found")
            return JsonResponse({'success': False, 'error': 'Borrow record not found'}, status=404)
    print("Invalid request method:", request.method)
    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

@login_required
def my_books_count(request):
    count = Borrow.objects.filter(user=request.user, returned=False).count()
    return JsonResponse({'count': count})


# =========================
# ADMIN / STAFF ACTIONS
# =========================
@login_required
def borrow_book(request, book_id):
    book = get_object_or_404(Book, id=book_id)
    if book.available:
        Borrow.objects.create(user=request.user, book=book)
        book.available = False
        book.total_borrows += 1
        book.save()
    return redirect('homepage')


@login_required
def return_book(request, borrow_id):
    borrow = get_object_or_404(Borrow, id=borrow_id)
    borrow.returned = True
    borrow.book.available = True
    borrow.book.save()
    borrow.save()
    return redirect('/adminpanel/?section=borrows')

@login_required
def adminpanel(request):
    # =========================
    # STAFF ONLY ACCESS
    # =========================
    if not request.user.is_staff:
        return redirect('homepage')

    # =========================
    # ADD / EDIT BOOK
    # =========================
    if request.method == 'POST':
        book_id = request.POST.get('book_id')

        if book_id:
            book = get_object_or_404(Book, id=book_id)
        else:
            book = Book()

        book.title = request.POST.get('title')
        book.author = request.POST.get('author')
        book.category = request.POST.get('category')
        book.cover_url = request.POST.get('cover_url')

        # SAFE CONVERSIONS
        book.pages = int(request.POST.get('pages') or 0)
        book.year = int(request.POST.get('year') or 0)
        book.description = request.POST.get('description') or ""

        book.save()
        return redirect('/adminpanel/?section=books')

    # =========================
    # BOOK DATA
    # =========================
    books = Book.objects.all()

    # ACTIVE BORROWS ONLY
    borrows = Borrow.objects.filter(returned=False).select_related('book', 'user')

    # RETURNED BORROWS
    returned_borrows = Borrow.objects.filter(returned=True)

    # =========================
    # STATS
    # =========================
    total_books = books.count()
    active_borrows = borrows.count()
    returned_count = returned_borrows.count()

    available_books = total_books - active_borrows
    if available_books < 0:
        available_books = 0

    total_pages = sum(book.pages or 0 for book in books)

    # =========================
    # POPULAR BOOKS
    # =========================
    popular_books = Book.objects.annotate(
        avg_rating=Avg('reviews__rating')
    ).order_by('-total_borrows', '-avg_rating', 'title')[:5]

    # =========================
    # CONTEXT
    # =========================
    context = {
        'books': books,
        'borrows': borrows,

        'total_books': total_books,
        'borrowed': active_borrows,
        'returned': returned_count,
        'available': available_books,

        'popular_books': popular_books,
        'total_pages': total_pages,
        'now': timezone.now(),
    }

    return render(request, 'adminpanel.html', context)


@login_required
def add_book(request):
    if not request.user.is_staff:
        return redirect('homepage')
    if request.method == 'POST':
        Book.objects.create(
            title=request.POST['title'],
            author=request.POST['author'],
            category=request.POST['category'],
            pages=request.POST['pages'],
            year=request.POST['year'],
            cover_url=request.POST['cover_url'],
            description=request.POST.get('description', '')
        )
    return redirect('adminpanel')


@login_required
def delete_book(request, id):
    if not request.user.is_staff:
        return redirect('homepage')
    book = get_object_or_404(Book, id=id)
    book.delete()
    return redirect('/adminpanel/?section=books')

@login_required
def api_borrowed_books(request):
    borrowed = Borrow.objects.filter(user=request.user, returned=False).select_related('book')
    data = [
        {
            'id': b.book.id,
            'title': b.book.title,
            'author': b.book.author,
            'cover_url': b.book.cover_url,
            'category': b.book.category,
            'due_date': b.due_date.isoformat() if b.due_date else None
        }
        for b in borrowed
    ]
    return JsonResponse({'borrowed_books': data})

@login_required
def rate_book(request, book_id, value):
    # 🚫 BLOCK ADMIN / STAFF
    if request.user.is_staff:
        return redirect('adminpanel')

    book = get_object_or_404(Book, id=book_id)

    value = int(value)
    if value < 1 or value > 5:
        return redirect('homepage')

    Rating.objects.update_or_create(
        user=request.user,
        book=book,
        defaults={'rating': value}
    )

    return redirect('homepage')

@login_required
@csrf_exempt
def submit_review(request):
    if request.method == "POST":
        book_id = request.POST.get("book_id")
        rating = request.POST.get("rating")
        feedback = request.POST.get("feedback")

        try:
            book = Book.objects.get(id=book_id)

            # ✅ ensure rating is integer
            rating = int(rating)

            # ✅ create review
            Review.objects.update_or_create(
                user=request.user,
                book=book,
                defaults={
                    'rating': rating,
                    'feedback': feedback
                }
                
            )



            # ✅ calculate new average rating
            from django.db.models import Avg

            avg = Review.objects.filter(book=book).aggregate(avg=Avg('rating'))['avg']

            if avg is None:
               avg = 0

            avg = max(0, min(float(avg), 5))

            return JsonResponse({
                "success": True,
                "avg_rating": round(avg, 1) if avg else 0
            })

        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": str(e)
            })

    return JsonResponse({"success": False})

    rating = int(rating)

    if rating < 1 or rating > 5:
        return JsonResponse({
        "success": False,
        "error": "Invalid rating value"
    })

@csrf_exempt
@login_required
def set_due_date(request, borrow_id):
    if request.method == "POST":
        borrow = get_object_or_404(Borrow, id=borrow_id)

        due_date = request.POST.get("due_date") or request.POST.get("return_date")

        if due_date:
            parsed_date = parse_date(due_date)  # ✅ converts string → date safely

            if parsed_date:
                borrow.due_date = parsed_date
                borrow.save()

        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)

def home_view(request):
    """
    This is the page users see after successful signup.
    """
    return render(request, 'home.html')