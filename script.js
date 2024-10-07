const menuIcon = document.querySelector("#menu-icon");
const navLinks = document.querySelector(".nav-links");
const links = document.querySelectorAll(".nav-links a");

menuIcon.addEventListener("click", () => {
    navLinks.classList.toggle('active');
});

window.addEventListener("beforeunload", () => {
    const forms = document.getElementsByTagName("form");
    for (const form of forms) {
        form.reset();
    }
});

links.forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove('active'); // Close menu on link click
    });
});

// menuIcon.addEventListener("click", () => {
//     console.log("Menu icon clicked!"); // Check if this logs
//     navLinks.classList.toggle('active');
// });
