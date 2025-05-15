const express = require('express')
const axios = require('axios') 
const { stringify } = require('querystring')
const iconv = require('iconv-lite');
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

function init_orderid() { 
  const now = new Date();
  const pad = num => String(num).padStart(2, '0');
  const year   = now.getFullYear();
  const month  = pad(now.getMonth() + 1);
  const day    = pad(now.getDate());
  const hour   = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());
  return `TEST${year}${month}${day}${hour}${minute}${second}`;
}

function decodeEucKrUri(encodedStr) {
  const bytes = encodedStr.match(/%[0-9A-F]{2}/gi).map(h => parseInt(h.slice(1), 16));
  const buffer = Buffer.from(bytes);
  return iconv.decode(buffer, 'euc-kr');
}

function getPayType(payMethod) {
  switch(payMethod) {
    case "CARD": return "PACA";
    case "BANK": return "PABK";
    case "VCNT": return "PAVC";
    case "MOBX": return "PAMC";
    case "TPNT": return "PAPT";
    case "GIFT": return "PATK";
  }
}

function getKcpCertInfo() {
  return "-----BEGIN CERTIFICATE-----MIIDgTCCAmmgAwIBAgIHBy4lYNG7ojANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJLUjEOMAwGA1UECAwFU2VvdWwxEDAOBgNVBAcMB0d1cm8tZ3UxFTATBgNVBAoMDE5ITktDUCBDb3JwLjETMBEGA1UECwwKSVQgQ2VudGVyLjEWMBQGA1UEAwwNc3BsLmtjcC5jby5rcjAeFw0yMTA2MjkwMDM0MzdaFw0yNjA2MjgwMDM0MzdaMHAxCzAJBgNVBAYTAktSMQ4wDAYDVQQIDAVTZW91bDEQMA4GA1UEBwwHR3Vyby1ndTERMA8GA1UECgwITG9jYWxXZWIxETAPBgNVBAsMCERFVlBHV0VCMRkwFwYDVQQDDBAyMDIxMDYyOTEwMDAwMDI0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAppkVQkU4SwNTYbIUaNDVhu2w1uvG4qip0U7h9n90cLfKymIRKDiebLhLIVFctuhTmgY7tkE7yQTNkD+jXHYufQ/qj06ukwf1BtqUVru9mqa7ysU298B6l9v0Fv8h3ztTYvfHEBmpB6AoZDBChMEua7Or/L3C2vYtU/6lWLjBT1xwXVLvNN/7XpQokuWq0rnjSRThcXrDpWMbqYYUt/CL7YHosfBazAXLoN5JvTd1O9C3FPxLxwcIAI9H8SbWIQKhap7JeA/IUP1Vk4K/o3Yiytl6Aqh3U1egHfEdWNqwpaiHPuM/jsDkVzuS9FV4RCdcBEsRPnAWHz10w8CX7e7zdwIDAQABox0wGzAOBgNVHQ8BAf8EBAMCB4AwCQYDVR0TBAIwADANBgkqhkiG9w0BAQsFAAOCAQEAg9lYy+dM/8Dnz4COc+XIjEwr4FeC9ExnWaaxH6GlWjJbB94O2L26arrjT2hGl9jUzwd+BdvTGdNCpEjOz3KEq8yJhcu5mFxMskLnHNo1lg5qtydIID6eSgew3vm6d7b3O6pYd+NHdHQsuMw5S5z1m+0TbBQkb6A9RKE1md5/Yw+NymDy+c4NaKsbxepw+HtSOnma/R7TErQ/8qVioIthEpwbqyjgIoGzgOdEFsF9mfkt/5k6rR0WX8xzcro5XSB3T+oecMS54j0+nHyoS96/llRLqFDBUfWn5Cay7pJNWXCnw4jIiBsTBa3q95RVRyMEcDgPwugMXPXGBwNoMOOpuQ==-----END CERTIFICATE-----";
}

app.post('/approve', async (req, res) => {
  try{
    let responseApproveJson = {}

    if(req.body.res_cd === "0000") {
      const requestApproveJson = {}
      requestApproveJson.site_cd = req.body.site_cd
      requestApproveJson.tran_cd = req.body.tran_cd
      requestApproveJson.ordr_no = req.body.ordr_idxx
      requestApproveJson.pay_type = getPayType(requestApproveJson.pay_method)
      requestApproveJson.kcp_cert_info = getKcpCertInfo()
      requestApproveJson.enc_info = req.body.enc_info
      requestApproveJson.enc_data = req.body.enc_data

      // KCP 승인 API 요청
      const responseApprove = await axios.post(
        'https://stg-spl.kcp.co.kr/gw/enc/v1/payment',
        requestApproveJson,
        {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
          }
        }
      );

      responseApproveJson = responseApprove.data;
      responseApproveJson.good_name = decodeEucKrUri(req.body.good_name)
      responseApproveJson.ordr_no = req.body.ordr_idxx
    } else {
      responseApproveJson.res_msg = req.body.res_msg
      responseApproveJson.res_cd = req.body.res_cd
      responseApproveJson.trace_no = req.body.trace_no
      responseApproveJson.Ret_URL = req.body.Ret_URL
      responseApproveJson.approval_key = req.body.approval_key
      responseApproveJson.ordr_idxx = req.body.ordr_idxx
    }

    res.redirect(`/KcpSendBox?${stringify(responseApproveJson)}`);
  } catch (err) {
    res.redirect(`/KcpSendBox?${stringify({ error: err.message })}`);
  }
})

app.post('/register', async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.site_cd = "T0000";
    payload.kcp_cert_info = getKcpCertInfo();
    payload.Ret_URL = "http://localhost:3000/api/approve";
    payload.user_agent = "";
    payload.ordr_idxx = init_orderid();

    // KCP 거래 등록 API 요청
    const response = await axios.post(
      'https://stg-spl.kcp.co.kr/std/tradeReg/register',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        }
      }
    );

    const result = { ...response.data };
    if(result.Code === "0000") {
      result.site_cd = payload.site_cd;
      result.Ret_URL = payload.Ret_URL;
      result.ordr_idxx = payload.ordr_idxx;
      result.shop_name = "TEST SITE";
      result.currency = "410"
      result.quotaopt = "12";
      result.buyr_name = "홍길동";
      result.buyr_tel2 = "010-0000-0000";
      result.buyr_mail = "test@test.co.kr";
    } 

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/info', async (req, res) => {
    const response = {};
    response.site_cd = "T0000";
    response.ordr_idxx = init_orderid();
    response.shop_name = "TEST SITE";
    response.currency = "410"
    response.quotaopt = "12";
    response.buyr_name = "홍길동";
    response.buyr_tel2 = "010-0000-0000";
    response.buyr_mail = "test@test.co.kr";
    return res.json(response);
});

module.exports = app