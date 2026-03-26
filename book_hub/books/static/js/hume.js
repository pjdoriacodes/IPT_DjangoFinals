// ===============================
// 📚 BOOK MODAL STATE
// ===============================
let currentBookId = null;
let isAvailable = true;
let selectedRating = 0;
let isBorrowing = false;

// ===============================
// ⭐ STAR RATING
// ===============================
function setupStars() {
    const stars = document.querySelectorAll(".stars .star");

    stars.forEach((star, index) => {
        star.onclick = null; // 🧹 clear old handler

        star.onclick = () => {
            selectedRating = index + 1;

            stars.forEach((s, i) => {
                s.classList.toggle("active", i < selectedRating);
            });
        };
    });
}

// ===============================
// 📖 OPEN MODAL
// ===============================
function openModal(title, author, desc, image, pages, year, id, available, category) {
    currentBookId = id;

    // Helper to populate and show book modal
    function showBookModalUI() {
        const modal = document.getElementById("bookModal");
        if (!modal) return;

        modal.classList.add("show");

        document.getElementById("modalTitle").innerText = title;
        document.getElementById("borrowText").innerText =
            `You're about to borrow "${title}". Please set your return date before continuing.`;
        document.getElementById("modalAuthor").innerText = "by " + author;
        document.getElementById("modalDesc").innerText = desc;
        document.getElementById("modalImage").src = image;
        document.getElementById("modalPages").innerText = pages + " pages";
        document.getElementById("modalYear").innerText = year;
        document.getElementById("modalCategory").innerText = category;
    }

    // First, check if the book is borrowed
    fetch(`/api/check-borrow/${id}/`)
        .then(res => res.json())
        .then(data => {
            const isBorrowed = data.is_borrowed;
            const isMine = data.borrowed_by_user;
            const borrower = data.borrowed_by_username || "another user";

            // ❌ Block users if borrowed by someone else
            if (isBorrowed && !isMine) {
                openUnavailableModal(title, borrower); // ✅ pass borrower
                return; // stop execution, do NOT show book modal
            }

            // ✅ Allowed: show book modal
            showBookModalUI();

            // Set availability state for borrow button
            isAvailable = !isBorrowed;
            updateBorrowButton();
        })
        .catch(() => {
            // fallback: allow modal if API fails
            showBookModalUI();

            isAvailable = true;
            updateBorrowButton();
        });
}

function closeModal() {
    const modal = document.getElementById("bookModal");
    modal.classList.remove("show");

    selectedRating = 0;
document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));
}

function syncBookStatus(bookId, available) {

    // 1️⃣ Update modal state
    isAvailable = available;
    updateBorrowButton();

    // 2️⃣ Update catalog card
    const card = document.querySelector(`.card[data-id='${bookId}']`);
    if (card) {

        // ✅ update dataset (VERY IMPORTANT)
        card.dataset.available = available;

        // ✅ update disabled style
        if (available) {
            card.classList.remove("disabled");
        } else {
            card.classList.add("disabled");
        }

        // ✅ update button
        const btn = card.querySelector(".quick-btn, .borrow-btn");
        if (btn) {
            btn.innerText = available ? "Borrow" : "Borrowed";
            btn.classList.toggle("borrowed", !available);
        }

        // ✅ update status badge text
        const status = card.querySelector(".status");
        if (status) {
            status.innerText = available ? "Available" : "Unavailable";
            status.classList.toggle("available", available);
            status.classList.toggle("unavailable", !available);
        }
    }

    // 3️⃣ Update My Books tab
    const myBookCard = document.querySelector(`.mybook-card[data-book-id='${bookId}']`);
    if (myBookCard && available) {
        myBookCard.remove();
    }

    // 4️⃣ Update badge counter
    updateBadge();
}

function toggleBorrowReturn() {
    if (!currentBookId) return;

    const url = isAvailable
        ? `/api/borrow/${currentBookId}/`
        : `/api/return/${currentBookId}/`;

    fetch(url, {
        method: "POST",
        headers: {
            "X-CSRFToken": getCSRFToken(),
            "Content-Type": "application/json"
        },
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            alert(data.error || "Server error");
            return;
        }

        // ✅ Sync UI everywhere
        syncBookStatus(currentBookId, !isAvailable);

        // ✅ Close modals if it was a return
        if (!isAvailable) { 
            closeModal();
            closeReviewModal();
            showTab('catalog');
        }
    });
}

// Corrected remove function
function removeBookFromMyList(bookId) {
    const bookCard = document.querySelector(`.mybook-card[data-book-id="${bookId}"]`);
    if (bookCard) {
        bookCard.remove();
    }
}

// Example: Update button text and class in modal
function updateBorrowButton() {
    const borrowBtn = document.getElementById("borrowBtn");
    if (!borrowBtn) return;

    if (isAvailable) {
        borrowBtn.innerText = "Borrow This Book";
        borrowBtn.classList.add("borrow-btn");
        borrowBtn.classList.remove("return-btn");
    } else {
        borrowBtn.innerText = "Return This Book";
        borrowBtn.classList.add("return-btn");
        borrowBtn.classList.remove("borrow-btn");
    }
}

function loadFeedback(bookId) {
    console.log("Loading feedback for book:", bookId);

    fetch(`/api/book-feedback/${bookId}/`)
        .then(res => res.json())
        .then(data => {
            console.log("Feedback data:", data); // 👈 ADD THIS

            const list = document.getElementById("reviewList");
            list.innerHTML = "";

            if (!data.reviews || data.reviews.length === 0) {
                list.innerHTML = "<p class='empty'>No reviews yet.</p>";
                return;
            }

          data.reviews.forEach(r => {
    const item = document.createElement("div");
    item.className = "feedback-item";

    // Create the HTML for user + rating container
    item.innerHTML = `
       <div class="feedback-header">
            <strong>${r.user}</strong>
            <span class="rating-stars" id="rating-${r.id}"></span>
       </div>
       <p>${r.feedback || "No comment provided."}</p>
    `;

    list.appendChild(item);

    // Generate 5 stars for this rating
    const starContainer = document.getElementById(`rating-${r.id}`);
    starContainer.innerHTML = ""; // clear if anything

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.classList.add("fa-star", "star");

        if (i <= r.rating) {
            star.classList.add("fas", "filled"); // yellow filled star
        } else {
            star.classList.add("far"); // gray empty star
        }

        starContainer.appendChild(star);
    }
});
        });
}



// ===============================
// 🔁 UPDATE CARD AFTER BORROW
// ===============================
function updateCardStatus(bookId, available) {
    // Find the homepage card
    const card = document.querySelector(`.card[data-id='${bookId}']`);
    if (!card) return;

    // Find the button inside the card (could be borrow-btn or quick-btn)
    const btn = card.querySelector(".borrow-btn, .quick-btn");
    if (!btn) return;

    if (available) {
        btn.innerText = "Borrow";
        btn.classList.remove("borrowed");
    } else {
        btn.innerText = "Borrowed";
        btn.classList.add("borrowed");
    }
}

// ===============================
// ⭐ SUBMIT REVIEW (MAIN FEATURE 🔥)
// ===============================
function submitReview() {
    const feedback = document.getElementById("feedback").value;

    if (selectedRating === 0) {
        alert("Please select a rating!");
        return;
    }

    fetch("/api/submit-review/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": getCSRFToken()
        },
        body: `book_id=${currentBookId}&rating=${selectedRating}&feedback=${encodeURIComponent(feedback)}`
    })
    .then(res => res.json())
    .then(data => {
        console.log("Submit response:", data); // ✅ DEBUG

        if (data.success) {
            showReviewSuccess();

            // ✅ reload feedback list
            loadFeedback(currentBookId);

            // ✅ reset form
            selectedRating = 0;
            document.getElementById("feedback").value = "";
            document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));

            // ✅ update card rating safely
            updateCardRating(currentBookId, data.avg_rating);

        } else {
            alert("Error: " + (data.error || "Submitting review failed"));
        }
    })
    .catch(() => alert("Server error."));
}

// ===============================
// ⭐ UPDATE CARD RATING UI
// ===============================
function updateCardRating(bookId, avg) {
    const card = document.querySelector(`.card[data-id='${bookId}']`);
    if (!card) return;

    const ratingEl = card.querySelector(".card-rating");
    if (!ratingEl) return;

    // Ensure avg is a float number between 0–5
    let safeAvg = parseFloat(avg) || 0;
    safeAvg = Math.max(0, Math.min(safeAvg, 5)); // just in case

    // ✅ FADE OUT
    ratingEl.style.opacity = "0";

    setTimeout(() => {
        ratingEl.innerHTML = "";

        // ✅ GENERATE 5 STARS
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("i");

            if (i <= Math.floor(safeAvg)) {
                // Full star
                star.className = "fa-solid fa-star star filled";
            } else if (i - safeAvg < 1) {
                // Half star
                star.className = "fa-solid fa-star-half-stroke star filled";
            } else {
                // Empty star
                star.className = "fa-regular fa-star star";
            }

            ratingEl.appendChild(star);
        }

        // ✅ DISPLAY RATING NUMBER (1.0 – 5.0)
        const num = document.createElement("span");
        num.className = "rating-number";
        num.innerText = safeAvg.toFixed(1);

        ratingEl.appendChild(num);

        // ✅ FADE IN
        ratingEl.style.opacity = "1";

    }, 150);
}
// ===============================
// 🔐 CSRF TOKEN
// ===============================
function getCSRFToken() {
    return document.cookie.split(';')
        .map(c => c.trim())
        .find(c => c.startsWith("csrftoken="))
        ?.split("=")[1] || "";
}

// ===============================
// 🔍 FILTER + SEARCH
// ===============================
let currentCategory = "all";
const searchInput = document.getElementById("searchInput");
const cards = document.querySelectorAll(".card");

document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentCategory = this.innerText.toLowerCase().trim();
        filterBooks();
    });
});

if (searchInput) searchInput.addEventListener("keyup", filterBooks);

function filterBooks() {
    const searchValue = searchInput?.value.toLowerCase().trim() || "";

    cards.forEach(card => {
        const title = (card.dataset.title || "").toLowerCase();
        const author = (card.dataset.author || "").toLowerCase();
        const category = (card.dataset.category || "").toLowerCase().trim();

        const matchSearch = title.includes(searchValue) || author.includes(searchValue);
        const matchCategory = currentCategory === "all" || category.includes(currentCategory);

        card.style.display = (matchSearch && matchCategory) ? "block" : "none";
    });
}

// ===============================
// 📑 TAB SWITCH
// ===============================
function showTab(tab, el) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    document.getElementById(tab).classList.add("active");
    if (el) el.classList.add("active");

    if (tab === "mybooks") loadMyBooks();
}

// ===============================
// 📌 LOAD MY BOOKS
// ===============================
function loadMyBooks() {
    fetch("/api/borrowed-books/")
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("mybooks");
            container.innerHTML = "<h2>My Borrowed Books</h2>";

            if (data.borrowed_books.length === 0) {
                container.innerHTML += '<p class="empty">No borrowed books yet.</p>';
                return;
            }

            const grid = document.createElement("div");
            grid.className = "grid";

            data.borrowed_books.forEach(b => {
                const card = document.createElement("div");
                card.className = "card mybook-card";
                card.dataset.bookId = b.id;

                card.innerHTML = `
                    <div class="card-img">
                        <img src="${b.cover_url}">
                    </div>
                    <div class="card-info">
                     <span class="category-badge">${b.category}</span>
<span class="due-date">Due: ${b.due_date ? new Date(b.due_date).toLocaleDateString() : "N/A"}</span>
                        <h3>${b.title}</h3>
                        <p>${b.author}</p>
                        <button class="return-btn" onclick="returnBookFromTab(this)">Return</button>
                    </div>
                `;

                grid.appendChild(card);
            });

            container.appendChild(grid);

            fetch("/api/visited-mybooks/", {
                method: "POST",
                headers: {"X-CSRFToken": getCSRFToken()}
            }).then(() => updateBadge());
        });
}

// ===============================
// 📌 RETURN BOOK
// ===============================
function returnBookFromTab(btn) {
    const card = btn.closest(".card");
    const bookId = card.dataset.bookId;

    if (!bookId) return;

    fetch(`/api/return/${bookId}/`, {
        method: "POST",
        headers: {
            "X-CSRFToken": getCSRFToken(),
            "Content-Type": "application/json"
        }
    })
    .then(res => res.json())
    .then(data => {

        if (!data.success) {
            alert(data.error || "Failed to return book");
            return;
        }

        // ✅ 1. REMOVE CARD FROM MY BOOKS (instant UI update)
        card.style.transition = "all 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";

        setTimeout(() => {
            card.remove();

            // ✅ 2. Update catalog + other UI
            syncBookStatus(bookId, true);

            // ✅ 3. Close modals if open
            closeModal();
            closeReviewModal();

            // ✅ 4. Update badge count
            updateBadge();

            // ✅ 5. If no more books, show empty state
            const container = document.getElementById("mybooks");
            if (container && container.querySelectorAll(".mybook-card").length === 0) {
                container.innerHTML = `
                    <h2>My Borrowed Books</h2>
                    <p class="empty">No borrowed books yet.</p>
                `;
            }
        }, 300);
    })
    .catch(err => {
        console.error(err);
        alert("Server error while returning book");
    });
}
// ===============================
// 📌 BADGE
// ===============================
function updateBadge() {
    fetch("/api/my-books-count/")
        .then(res => res.json())
        .then(data => {
            const tab = document.querySelector(".tab:nth-child(2)");
            if (!tab) return;

            let badge = tab.querySelector(".badge");

            if (data.count > 0) {
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "badge";
                    tab.appendChild(badge);
                }
                badge.innerText = data.count;
            } else if (badge) {
                badge.remove();
            }
        });
}

// JS
const toggle = document.getElementById("themeToggle");
const body = document.body;

if(localStorage.getItem("darkMode") === "enabled") {
    toggle.checked = true;
    body.classList.add("dark-mode");
}

toggle.addEventListener("change", () => {
    body.classList.toggle("dark-mode");
    if(toggle.checked) {
        localStorage.setItem("darkMode", "enabled");
    } else {
        localStorage.setItem("darkMode", "disabled");
    }
});

// ===============================
// 🚪 LOGOUT MODAL
// ===============================
const logoutModal = document.getElementById("logoutModal");

function openLogoutModal(e) {
    e.preventDefault();
    if (!logoutModal) return;

    logoutModal.style.display = "flex";
    setTimeout(() => {
        logoutModal.classList.add("show");
    }, 10);
}

function closeLogoutModal() {
    if (!logoutModal) return;

    logoutModal.classList.remove("show");

    setTimeout(() => {
        logoutModal.style.display = "none";
    }, 200);
}

function toggleFeedback() {
    const container = document.getElementById("feedbackContainer");

    if (container.classList.contains("show")) {
        container.classList.remove("show");
    } else {
        container.classList.add("show");
        loadFeedback(currentBookId);
    }
}

function openReviewModal() {
    console.log("OPEN REVIEW MODAL");

    const modal = document.getElementById("reviewModal");

    if (!modal) {
        console.error("reviewModal NOT FOUND");
        return;
    }

    modal.classList.add("show");

    if (currentBookId) {
        loadFeedback(currentBookId);
    } else {
        console.warn("No book selected yet");
    }
}

function closeReviewModal() {
    const modal = document.getElementById("reviewModal");
    if (!modal) return;

    modal.classList.remove("show");
}

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeModal();
        closeReviewModal();
        closeLogoutModal();
    }
});

// ===============================
// 🌍 GLOBAL MODAL HANDLER
// ===============================
document.addEventListener("DOMContentLoaded", function () {

    // ⭐ Setup stars
    setupStars();

    // ❌ FIX: Close button not working
    const closeBtn = document.getElementById("closeModalBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    // ✅ Prevent modal content click from closing
    const modalContent = document.querySelector(".modal-content");
    if (modalContent) {
        modalContent.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

    // 🌍 GLOBAL CLICK HANDLER
    document.addEventListener("click", function (e) {

        // 📖 BOOK MODAL (click outside)
        const bookModal = document.getElementById("bookModal");
        if (bookModal && e.target === bookModal) {
            closeModal();
        }

        // ⭐ REVIEW MODAL
        const reviewModal = document.getElementById("reviewModal");
        if (reviewModal && e.target === reviewModal) {
            closeReviewModal();
        }

        // 🚪 LOGOUT MODAL
        const logoutModal = document.getElementById("logoutModal");
        if (logoutModal && e.target === logoutModal) {
            closeLogoutModal();
        }
    });

});

function openBorrowConfirmModal() {
    const modal = document.getElementById("borrowConfirmModal");
    if (!modal) return;

    modal.classList.add("show");

    // reset fields
    const dateInput = document.getElementById("returnDateInput");
    const noteInput = document.getElementById("noteInput");

    if (dateInput) dateInput.value = "";
    if (noteInput) noteInput.value = "";
}

function closeBorrowConfirmModal() {
    const modal = document.getElementById("borrowConfirmModal");
    if (!modal) return;

    modal.classList.remove("show");
}

function confirmBorrow() {
    console.log("CONFIRM WORKING", currentBookId);
    if (!currentBookId || isBorrowing) return;

    isBorrowing = true; // 🔒 lock

    const btn = document.getElementById("confirmBorrowBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Processing...";
    }

    const dateInput = document.getElementById("returnDateInput");
    const noteInput = document.getElementById("noteInput");

    const selectedReturnDate = dateInput ? dateInput.value : null;
    const borrowNote = noteInput ? noteInput.value : "";

    if (!selectedReturnDate) {
        alert("Please select a return date.");
        isBorrowing = false;
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Confirm Borrow";
        }
        return;
    }

    console.log("Sending request...");
    
    fetch(`/api/borrow/${currentBookId}/`, {
    method: "POST",
    headers: {
        "X-CSRFToken": getCSRFToken(),
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        return_date: selectedReturnDate,
        note: borrowNote
    })
})
   .then(res => {
    console.log("Response received", res);
    return res.json();
})
    .then(data => {
        if (!data.success) {
            alert(data.error || "Server error");
            return;
        }

        syncBookStatus(currentBookId, false);

        closeBorrowConfirmModal();
        closeModal();

        const title = document.getElementById("modalTitle").innerText;
        showBorrowSuccess(title);

    setTimeout(() => {
    showTab('catalog');
    }, 2000);
    })
    .catch(() => alert("Server error"))
    .finally(() => {
        isBorrowing = false;
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Confirm Borrow";
        }
    });
}

function handleBorrowClick() {
    if (isAvailable) {
        openBorrowConfirmModal(); // NEW FLOW
    } else {
        toggleBorrowReturn(); // EXISTING RETURN FLOW
    }
}

function showBorrowSuccess(title) {
    const box = document.getElementById("borrowSuccess");
    const text = document.getElementById("successText");
    const sound = document.getElementById("successSound");
    const confettiContainer = document.querySelector(".confetti-container");

    text.innerText = `"${title}" borrowed successfully!`;

    box.classList.add("show");

    // sound
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }

    // confetti
    for (let i = 0; i < 40; i++) {
        const c = document.createElement("div");
        c.className = "confetti";
        c.style.left = Math.random() * 100 + "%";
        c.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
        c.style.animationDuration = (Math.random() * 1 + 1) + "s";
        confettiContainer.appendChild(c);

        setTimeout(() => c.remove(), 1500);
    }

    setTimeout(() => box.classList.add("done"), 1200);

    setTimeout(() => {
        box.classList.remove("show", "done");
    }, 3000);
}

function openUnavailableModal(title, borrower = "another user") {
    const modal = document.getElementById("unavailableModal");
    const text = document.getElementById("unavailableText");

    if (text) {
        text.innerText = `"${title}" is currently borrowed by ${borrower}.`;
    }

    if (modal) {
        modal.classList.add("show");
    }

    // optional vibration
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

function closeUnavailableModal() {
    const modal = document.getElementById("unavailableModal");
    if (!modal) return;

    modal.classList.remove("show");
}

document.addEventListener("click", function (e) {
    const modal = document.getElementById("unavailableModal");
    if (modal && e.target === modal) {
        closeUnavailableModal();
    }
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeUnavailableModal();
    }
});

function showBookModal(title, author, desc, image, pages, year, id, category, borrowed) {

    const modal = document.getElementById("bookModal");
    modal.classList.add("show");

    document.getElementById("modalTitle").innerText = title;

    document.getElementById("borrowText").innerText =
        `You're about to borrow "${title}". Please set your return date before continuing.`;

    document.getElementById("modalAuthor").innerText = "by " + author;
    document.getElementById("modalDesc").innerText = desc;
    document.getElementById("modalImage").src = image;
    document.getElementById("modalPages").innerText = pages + " pages";
    document.getElementById("modalYear").innerText = year;
    document.getElementById("modalCategory").innerText = category;

    // ⭐ CRITICAL PART
    isAvailable = !borrowed;

    updateBorrowButton();
}

// ✅ AUTO OPEN TAB FROM URL
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");

    if (section === "mybooks") {
        document.getElementById("catalog").classList.remove("active");
        document.getElementById("mybooks").classList.add("active");

        // Optional: highlight tab button
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector('[data-tab="mybooks"]').classList.add("active");
    }
});

function showReviewSuccess() {
    const modal = document.getElementById("reviewSuccessModal");
    if (!modal) return;

    modal.classList.add("show");
}

function closeReviewSuccess() {
    const modal = document.getElementById("reviewSuccessModal");
    if (!modal) return;

    modal.classList.remove("show");
}