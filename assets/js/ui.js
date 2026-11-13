// Comportamentos comuns a todas as páginas: menu móvel, ano do rodapé e links do WhatsApp.
import { whatsappLink } from "./utils.js";

const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

document.querySelectorAll("a[data-wa]").forEach((a) => {
  a.href = whatsappLink(a.dataset.wa || "Olá, Leandro! Vim pelo site da LN Sistemas.");
  a.target = "_blank";
  a.rel = "noopener";
});
