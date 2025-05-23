const overlay    = document.getElementById('custom-confirm-overlay');
const boxBody    = document.getElementById('custom-confirm-body');
const yesBtn     = document.getElementById('custom-confirm-yes');
const noBtn      = document.getElementById('custom-confirm-no');
let yesCallback  = null;

yesBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  if (typeof yesCallback === 'function') yesCallback();
  yesCallback = null;
});
noBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  yesCallback = null;
});

/**
 * 커스텀 confirm 호출
 * @param {string} message 표시할 메시지
 * @param {function} onYes   “예” 클릭 시 실행할 콜백
 */
function openConfirm(message, onYes) {
  boxBody.textContent = message;
  yesCallback = onYes;
  overlay.style.display = 'flex';
}

async function m_Completepayment( FormOrJson, closeEvent ) {
    closeEvent(); 
    const frm = document.createElement('form');
    frm.method = 'POST';
    frm.action = '/api/approve';
    frm.acceptCharset = 'EUC-KR';

    const requestApproveJson = {
        "res_cd" : "",
        "res_msg" : "",
        "tran_cd" : "",
        "pay_method" : getPCPayMethod(),
        "enc_info" : "",
        "enc_data" : ""
    }

    appendHiddenInput(frm, requestApproveJson)
    document.body.appendChild(frm);

    GetField( frm, FormOrJson );
    frm.submit();
}

async function registerPaymentPC() {
    const PCPayMethod = getPCPayMethod()

    if (!PCPayMethod) {
        alert("결제수단을 선택해주세요.");
        return;
    }

    const requestRegisterJson = {
        "good_mny" : "1004",
        "good_name" : "운동화"
    }
    const responseRegisterPost = await fetch('/api/info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify(requestRegisterJson)
    });
    const responseRegisterJson = await responseRegisterPost.json();
    const requestPaymentWindowJson = {
        "shop_name" : responseRegisterJson.shop_name,
        "currency" : responseRegisterJson.currency,
        "quotaopt" : responseRegisterJson.quotaopt,
        "site_cd" : responseRegisterJson.site_cd,
        "buyr_name" : responseRegisterJson.buyr_name,
        "buyr_tel2" : responseRegisterJson.buyr_tel2,
        "buyr_mail" : responseRegisterJson.buyr_mail,
        "ordr_idxx" : responseRegisterJson.ordr_idxx,
        "pay_method" : PCPayMethod.pay_method,
        "payco_direct" : PCPayMethod.payco_direct,
        "tosspay_direct" : PCPayMethod.tosspay_direct,
        "naverpay_direct" : PCPayMethod.naverpay_direct
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.acceptCharset = 'EUC-KR';

    appendHiddenInput(form, requestPaymentWindowJson);
    appendHiddenInput(form, requestRegisterJson);

    try {
        KCP_Pay_Execute_Web( form );
    } catch (e) {
    }
}

async function registerPaymentMobile() {
    const mobilePayMethod = getMobilePayMethod()
    const requestRegisterJson = {
        "good_mny" : "1004",
        "good_name" : "운동화",
        "pay_method" : mobilePayMethod.pay_method
    }
    
    const responseRegisterPost = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify(requestRegisterJson)
    });
    const responseRegisterJson = await responseRegisterPost.json();

    if(responseRegisterJson.Code === "0000") {
        window.parent.postMessage({ type: 'kcp-result', payload: responseRegisterJson }, '*');
        // openConfirm('정말 결제 요청을 진행하시겠습니까?', () => {
        // })

            const requestPaymentWindowJson = {
                ... requestRegisterJson,
                "shop_name" : responseRegisterJson.shop_name,
                "currency" : responseRegisterJson.currency,
                "quotaopt" : responseRegisterJson.quotaopt,
                "site_cd" : responseRegisterJson.site_cd,
                "Ret_URL" : responseRegisterJson.Ret_URL,
                "buyr_name" : responseRegisterJson.buyr_name,
                "buyr_tel2" : responseRegisterJson.buyr_tel2,
                "buyr_mail" : responseRegisterJson.buyr_mail,
                "ordr_idxx" : responseRegisterJson.ordr_idxx,
                "approval_key" : responseRegisterJson.approvalKey,
                "PayUrl" : responseRegisterJson.PayUrl,
                "van_code" : mobilePayMethod.van_code,
                "payco_direct" : mobilePayMethod.payco_direct,
                "tosspay_direct" : mobilePayMethod.tosspay_direct,
                "naverpay_direct" : mobilePayMethod.naverpay_direct
            }

            // if(mobilePayMethod.easyPayment) {
            //     switch(mobilePayMethod.easyPayment) {
            //         case "payco": {
            //             requestPaymentWindowJson.payco_direct = 'Y'
            //         }
                    
            //     }
            // }

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = responseRegisterJson.PayUrl;
            form.acceptCharset = 'EUC-KR';

            appendHiddenInput(form, requestPaymentWindowJson);

            document.body.appendChild(form);
            form.submit();
    } else {

    }
}

function getPCPayMethod() {
  const selected = document.querySelector('input[name="pay_method"]:checked');
  const type = selected?.value;

  const methodMap = {
    "신용카드": { pay_method: "100000000000" },
    "계좌이체": { pay_method: "010000000000" },
    "휴대폰":   { pay_method: "000010000000" },
    "페이코":   { pay_method: "100000000000", easyPayment: "payco" },
    "토스페이": { pay_method: "100000000000", easyPayment: "toss" },
    "네이버페이": { pay_method: "100000000000", easyPayment: "naverpay" }
  };

  if (!type) {
    alert("결제수단을 선택해주세요.");
    return null;
  }

  return methodMap[type] || null;
}

function getMobilePayMethod() {
  const selected = document.querySelector('input[name="pay_method"]:checked');
  const type = selected?.value;

  const methodMap = {
    "신용카드":   { pay_method: "CARD", van_code: "" },
    "페이코":     { pay_method: "CARD", van_code: "", payco_direct: "Y" },
    "토스페이":   { pay_method: "CARD", van_code: "", tosspay_direct: "Y" },
    "네이버페이": { pay_method: "CARD", van_code: "", naverpay_direct: "B" },
    "계좌이체":   { pay_method: "BANK", van_code: "" },
    "휴대폰":     { pay_method: "MOBX", van_code: "" }
  };

  if (!type) {
    alert("결제수단을 선택해주세요.");
    return null;
  }
  return methodMap[type] || null;
}
function appendHiddenInput(form, json) {
    Object.entries(json).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = key;
        input.value = value;
        form.appendChild(input);
    });
}