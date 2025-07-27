// adalet-gys-portal/assets/js/main.js

console.log('Main JS loaded');

// Örnek: Basit mobil menü aç/kapa
document.addEventListener('DOMContentLoaded', () => {
    const navbarToggle = document.querySelector('.navbar-toggle'); // CSS'de bu elementin var olduğunu varsayıyoruz
    const navbarNav = document.querySelector('.navbar-nav'); // CSS'de bu elementin var olduğunu varsayıyoruz

    if (navbarToggle && navbarNav) {
        navbarToggle.addEventListener('click', () => {
            navbarNav.classList.toggle('navbar-nav--open'); // CSS'de bu sınıfın tanımlı olduğunu varsayıyoruz
            navbarToggle.classList.toggle('navbar-toggle--open'); // CSS'de bu sınıfın tanımlı olduğunu varsayıyoruz
            // ARIA etiketleri için örnek (erişilebilirlik)
            const isOpen = navbarNav.classList.contains('navbar-nav--open');
            navbarToggle.setAttribute('aria-expanded', isOpen);
        });
    }
});
