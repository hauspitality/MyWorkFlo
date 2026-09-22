const filterButtons = document.querySelectorAll(".filter-button");
const workflowCards = document.querySelectorAll(".agent-card");
const auditForm = document.querySelector("#auditForm");
const auditResult = document.querySelector("#auditResult");
const siteHeader = document.querySelector(".site-header");

let headerTicking = false;

function updateHeaderState() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
  headerTicking = false;
}

if (siteHeader) {
  window.addEventListener(
    "scroll",
    () => {
      if (!headerTicking) {
        requestAnimationFrame(updateHeaderState);
        headerTicking = true;
      }
    },
    { passive: true },
  );

  updateHeaderState();
}

function formatList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const firstWorkflows = {
  HVAC: "catching missed calls and booking the simple ones",
  plumbing: "flagging urgent leaks fast and booking the rest",
  roofing: "booking inspections and sorting storm calls",
  electrical: "checking the job details and calling back the right way",
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    workflowCards.forEach((card) => {
      const matches = filter === "all" || card.dataset.category === filter;
      card.hidden = !matches;
    });
  });
});

auditForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const trade = document.querySelector("#tradeSelect").value;
  const leads = Number(document.querySelector("#leadSelect").value);
  const profit = Number(document.querySelector("#profitSelect").value);
  const selectedTools = [...auditForm.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );

  const workflow = firstWorkflows[trade] ?? firstWorkflows.HVAC;
  const toolStack = selectedTools.length ? formatList(selectedTools) : "your phone and email";
  const oneJobValue = profit;
  const threeJobValue = profit * 3;
  const likelyPlan = leads >= 75 ? "Growth ($299/mo)" : "Starter ($119/mo)";

  auditResult.innerHTML = `
    <span class="result-label">What MyWorkFlo would do for your ${trade} business</span>
    <strong>Start by ${workflow}</strong>
    <p>It works alongside ${toolStack}. One job you would've otherwise missed is worth about $${oneJobValue.toLocaleString()} — recover three in a month and that's about $${threeJobValue.toLocaleString()}. Best plan to start with: ${likelyPlan}, which includes booking, emergency detection, and handing off to a person when needed.</p>
    <a class="button button-primary audit-cta" href="https://app.myworkflo.com/login">Start my setup — about 10 minutes</a>
  `;
});
