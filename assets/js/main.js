// adalet-gys-portal/assets/js/main.js

console.log('Main JS loaded');

// DÜZELTME: Kodun çalışması için 'DOMContentLoaded' yerine,
// şablonun yüklendiğini garanti eden 'template-loaded' olayı dinleniyor.
document.addEventListener('template-loaded', () => {
    
    console.log('Template loaded, main.js initialising...');

    // Örnek: Basit mobil menü aç/kapa
    const navbarToggle = document.querySelector('.navbar-toggle'); // CSS'de bu elementin var olduğunu varsayıyoruz
    const navbarNav = document.querySelector('.navbar-nav'); // Artık bu elementin var olduğundan eminiz.

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
