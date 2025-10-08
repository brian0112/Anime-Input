// Theme toggle with localStorage
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if(saved === 'light') root.classList.add('light');
  function setLabel(){
    const light = root.classList.contains('light');
    btn.setAttribute('aria-pressed', String(light));
    btn.textContent = light ? '深色' : '淺色';
  }
  btn.addEventListener('click', ()=>{
    root.classList.toggle('light');
    localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
    setLabel();
  });
  setLabel();
})();

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Simple client-side form handling (no backend)
const form = document.getElementById('contactForm');
const msg = document.getElementById('formMsg');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  // Basic validation
  if(!data.name || !data.email || !data.message){
    msg.textContent = '請完整填寫表單。';
    return;
  }
  // Simulate sending
  msg.textContent = '已送出！（示範用：實際專案可串後端或第三方表單服務）';
  form.reset();
});
