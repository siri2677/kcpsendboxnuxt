async function loadData(form) {
    const formData = new FormData(form);

    // 2) JSON으로 변환 (필요시, 서버가 JSON을 기대할 때)
    const payload = {};
    formData.forEach((value, key) => {
        payload[key] = value;
    });

    try {
        // 3) fetch로 POST 요청 (JSON)
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        // const qs = new URLSearchParams(data).toString();
        // window.location.href = `/KcpHtmlLiveEditorMobile?${qs}`;
        console.error('API 호출 성공:', data);
        alert('API 호출 성공:' + data.PayUrl)

              // 3. POST 전송을 위한 form 동적 생성
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.PayUrl;

        // 숨겨진 input 추가
        const inputToken = document.createElement('input');
        inputToken.type = 'hidden';
        inputToken.name = 'token';
        inputToken.value = data;

        const inputStatus = document.createElement('input');
        inputStatus.type = 'hidden';
        inputStatus.name = 'PayUrl';
        inputStatus.value = data.PayUrl;

        form.appendChild(inputToken);
        form.appendChild(inputStatus);

        document.body.appendChild(form);
        form.submit();
        
        console.error('API 호출 성공:', data1);

        // window.parent.postMessage({ type: 'kcp-result', payload: data }, '*');
    } catch (err) {
        console.error('API 호출 실패:', err.message);
    }
}

function jsf__chk_type() {
    if ( document.order_info.ActionResult.value == "card" ) 
    {
        document.order_info.pay_method.value = "CARD";
    }
    else if ( document.order_info.ActionResult.value == "acnt" )
    {
        document.order_info.pay_method.value = "BANK";
    }
    else if ( document.order_info.ActionResult.value == "vcnt" )
    {
        document.order_info.pay_method.value = "VCNT";
    }
    else if ( document.order_info.ActionResult.value == "mobx" )
    {
        document.order_info.pay_method.value = "MOBX";
    }
    else if ( document.order_info.ActionResult.value == "ocb" )
    {
        document.order_info.pay_method.value = "TPNT";
        document.order_info.van_code.value = "SCSK";
    }
    else if ( document.order_info.ActionResult.value == "tpnt" )
    {
        document.order_info.pay_method.value = "TPNT";
        document.order_info.van_code.value = "SCWB";
    }
    else if ( document.order_info.ActionResult.value == "scbl" )
    {
        document.order_info.pay_method.value = "GIFT";
        document.order_info.van_code.value = "SCBL";
    }
    else if ( document.order_info.ActionResult.value == "sccl" )
    {
        document.order_info.pay_method.value = "GIFT";
        document.order_info.van_code.value = "SCCL";
    }
    else if ( document.order_info.ActionResult.value == "schm" )
    {
        document.order_info.pay_method.value = "GIFT";
        document.order_info.van_code.value = "SCHM";
    }
}

// 주문번호 생성 예제
function init_orderid()
{ 
    var today = new Date();
    var year  = today.getFullYear();
    var month = today.getMonth()+ 1;
    var date  = today.getDate();
    var time  = today.getTime();

    if(parseInt(month) < 10)
    {
        month = "0" + month;
    }

    var vOrderID = "TEST" + year + "" + month + "" + date + "" + time;

    document.forms[0].ordr_idxx.value = vOrderID;
}

init_orderid();