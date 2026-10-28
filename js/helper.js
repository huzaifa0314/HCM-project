
(function () {
  "use strict";

  function createHelper() {
    if (document.getElementById("hcmHelperButton")) return;

    const style = document.createElement("style");
    style.textContent = `
      #hcmHelperButton {
        position: fixed; right: 20px; bottom: 20px; z-index: 9999;
        background: #2563eb; color: white; border: 0; border-radius: 30px;
        padding: 14px 19px; cursor: pointer; font-size: 15px;
        box-shadow: 0 5px 18px #0002;
      }
      #hcmHelperPanel {
        position: fixed; right: 20px; bottom: 80px; z-index: 9999;
        width: min(350px, calc(100vw - 32px)); background: white;
        border: 1px solid #dbeafe; border-radius: 14px; overflow: hidden;
        box-shadow: 0 8px 30px #0002; color: #1e293b;
        font-family: Arial, sans-serif;
      }
      #hcmHelperPanel[hidden] { display: none; }
      #hcmHelperHeader {
        padding: 15px; background: #172554; color: white;
        display: flex; justify-content: space-between; align-items: center;
      }
      #hcmHelperClose {
        border: 0; background: transparent; color: white;
        font-size: 22px; cursor: pointer;
      }
      #hcmHelperBody { padding: 15px; }
      .hcmHelpQuestion {
        display: block; width: 100%; margin: 7px 0; padding: 11px;
        text-align: left; border: 1px solid #e2e8f0; border-radius: 8px;
        background: #f8fafc; color: #1e293b; cursor: pointer;
      }
      #hcmHelperAnswer {
        margin-top: 12px; padding: 12px; background: #eff6ff;
        border-radius: 8px; line-height: 1.5; font-size: 14px;
      }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "hcmHelperButton";
    button.type = "button";
    button.textContent = "Help ?";

    const panel = document.createElement("section");
    panel.id = "hcmHelperPanel";
    panel.hidden = true;
    panel.innerHTML = `
      <div id="hcmHelperHeader">
        <strong>HCM Lite Helper</strong>
        <button id="hcmHelperClose" type="button" aria-label="Close">×</button>
      </div>
      <div id="hcmHelperBody">
        <p>Apko kis cheez mein madad chahiye?</p>
        <button class="hcmHelpQuestion" data-answer="Attendance page khol kar Check In dabayein. Kaam khatam hone par Check Out dabayein. Agar button kaam na kare to admin se login aur attendance settings check karwayein.">Attendance kaise lagayein?</button>
        <button class="hcmHelpQuestion" data-answer="Dashboard se My Payslip kholein. Wahan salary breakdown dekhein aur Print / Save as PDF dabayein. Agar salary zero hai to admin se salary record check karwayein.">Payslip kahan milegi?</button>
        <button class="hcmHelpQuestion" data-answer="Leave section kholein, leave ki dates aur wajah enter karein, phir request submit karein. Approval ka status Leave section mein check karein.">Leave request kaise bhejein?</button>
        <button class="hcmHelpQuestion" data-answer="Pehle page refresh karein aur sahi account se login hone ki tasdeeq karein. Masla rahe to admin ko error message aur page ka naam batayein.">Koi page kaam nahi kar raha?</button>
        <div id="hcmHelperAnswer" aria-live="polite">Upar kisi sawal ko select karein.</div>
      </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(panel);

    button.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
    });

    panel.querySelector("#hcmHelperClose").addEventListener("click", function () {
      panel.hidden = true;
    });

    panel.querySelectorAll(".hcmHelpQuestion").forEach(function (question) {
      question.addEventListener("click", function () {
        panel.querySelector("#hcmHelperAnswer").textContent =
          question.getAttribute("data-answer");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createHelper);
  } else {
    createHelper();
  }
})();
