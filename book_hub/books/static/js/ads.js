function showSection(e, id) {
    // hide all
    document.querySelectorAll("main section").forEach(sec => {
        sec.classList.add("hidden");
    });

    // show selected
    document.getElementById(id).classList.remove("hidden");

    // active sidebar
    document.querySelectorAll(".sidebar li").forEach(li => {
        li.classList.remove("active");
    });

    e.currentTarget.classList.add("active");
}
// MODAL
function openModal() {
    document.getElementById("modal").style.display = "flex";
    document.getElementById("modalTitle").innerText = "Add Book";
    document.getElementById("bookId").value = "";
    document.getElementById("bookForm").reset();

    // Reset button text for Add Book
    document.getElementById("modalBtnText").innerText = "Add Book";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

function editBook(id, title, author, category, cover, pages, year, description) {
    openModal();

    document.getElementById("modalTitle").innerText = "Edit Book";

    document.getElementById("bookId").value = id;
    document.getElementById("title").value = title;
    document.getElementById("author").value = author;
    document.getElementById("category").value = category;
    document.getElementById("cover_url").value = cover;
    document.getElementById("pages").value = pages;
    document.getElementById("year").value = year;
    document.getElementById("description").value = description;

    // Change modal button text for Edit
    document.getElementById("modalBtnText").innerText = "Save Changes";
}

// DELETE CONFIRM
function confirmDelete() {
    return confirm("Delete this book?");
}

// SEARCH
document.addEventListener("DOMContentLoaded", () => {
    const search = document.querySelector(".search");

    if (search) {
        search.addEventListener("keyup", () => {
            let val = search.value.toLowerCase();

            document.querySelectorAll(".book-card").forEach(card => {
                card.style.display = card.innerText.toLowerCase().includes(val)
                    ? "flex" : "none";
            });
        });
    }
});

window.onclick = function(e) {
    const addModal = document.getElementById("modal");
    const deleteModal = document.getElementById("deleteModal");

    if (e.target === addModal) closeModal();
    if (e.target === deleteModal) closeDeleteModal();
};

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    // Optional: save preference
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
}

// Load saved theme on page load
window.onload = function () {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
};

const logoutBtn = document.querySelector(".logout-btn");
const modal = document.getElementById("logoutConfirmModal");
const cancelBtn = document.getElementById("cancelLogoutBtn");
const confirmBtn = document.getElementById("confirmLogoutBtn");

logoutBtn.addEventListener("click", function(e) {
    e.preventDefault();
    modal.style.display = "flex";
});

cancelBtn.addEventListener("click", function() {
    modal.style.display = "none";
});

confirmBtn.addEventListener("click", function() {
    window.location.href = "/logout/";
});

function showSuccess(isEdit = false) {
    const box = document.getElementById("successBox");
    const msg = document.getElementById("successMessage");

    // ✅ CHANGE MESSAGE
    msg.innerText = isEdit ? "Book updated successfully" : "Book added successfully";

    box.classList.add("show");

    setTimeout(() => {
        box.classList.add("done");
    }, 1000);

    setTimeout(() => {
        box.classList.remove("show", "done");
    }, 2500);
}

function handleSubmit(e) {
    e.preventDefault();

    const isEdit = document.getElementById("bookId").value !== "";

    showSuccess(isEdit);

    setTimeout(() => {
        e.target.submit();
    }, 2000);
}

function openDeleteModal(deleteUrl) {
    const modal = document.getElementById("deleteModal");
    const confirmBtn = document.getElementById("confirmDeleteBtn");

    confirmBtn.href = deleteUrl;
    modal.classList.add("show");
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.remove("show");
}


document.querySelectorAll(".delete-link").forEach(btn => {
    btn.addEventListener("click", function() {
        openDeleteModal(this.dataset.url);
    });
});

// ✅ AUTO OPEN SECTION AFTER REDIRECT
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");

    if (section) {
        const fakeEvent = {
            currentTarget: document.querySelector(`.sidebar li[onclick*="${section}"]`)
        };

        if (fakeEvent.currentTarget) {
            showSection(fakeEvent, section);
        }
    }
});