console.log('Main JS loaded');

document.addEventListener('template-loaded', () => {
  console.log('Template loaded, main.js initialising...');

  // Mobil menü aç/kapa
  const navbarToggle = document.querySelector('.navbar-toggle');
  const navbarNav = document.querySelector('.navbar-nav');
  if (navbarToggle && navbarNav) {
    navbarToggle.addEventListener('click', () => {
      navbarNav.classList.toggle('navbar-nav--open');
      navbarToggle.classList.toggle('navbar-toggle--open');
      const isOpen = navbarNav.classList.contains('navbar-nav--open');
      navbarToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // Dropdown menü işlevselliği
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector('.nav-link');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    if (link && menu) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.toggle('hidden');
        const isOpen = !menu.classList.contains('hidden');
        link.setAttribute('aria-expanded', isOpen);
      });

      // Tıklama dışında kapat
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          menu.classList.add('hidden');
          link.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
});
