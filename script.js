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

const firstWorkflows = {
  HVAC: "missed-call recovery plus Starter booking",
  plumbing: "urgent leak triage plus Starter booking",
  roofing: "inspection booking plus storm-lead qualification",
  electrical: "service-call qualification plus approved callback routing",
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
  const toolStack = selectedTools.length ? selectedTools.join(" plus ") : "phone plus email handoff";
  const conservativeScenario = profit;
  const strongerScenario = profit * 3;
  const likelyPlan = leads >= 75 ? "Growth ($299/mo)" : "Starter ($119/mo)";

  auditResult.innerHTML = `
    <span class="result-label">Recommended first workflow for ${trade}</span>
    <strong>${workflow}</strong>
    <p>Start self-serve with ${toolStack}. Scenario: one recovered job can represent about $${conservativeScenario.toLocaleString()} in gross profit; three recovered jobs can represent about $${strongerScenario.toLocaleString()}. Suggested first plan: ${likelyPlan} with booking, emergency triage, and human handoff rules.</p>
  `;
});
