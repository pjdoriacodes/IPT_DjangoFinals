from .models import Borrow

def borrowed_books_count(request):
    if request.user.is_authenticated:
        count = Borrow.objects.filter(
            user=request.user,
            returned=False
        ).count()
    else:
        count = 0

    return {
        'borrowed_count': count
    }