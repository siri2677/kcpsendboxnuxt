const express = require('express')
const session = require('express-session')
const axios = require('axios') 
const { stringify } = require('querystring')
const iconv = require('iconv-lite');
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret: 'kcpsendboxSessionKey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600_000 }
}))

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

// function decodeEucKrUri(encodedStr) {
//   const bytes = encodedStr.match(/%[0-9A-F]{2}/gi).map(h => parseInt(h.slice(1), 16));
//   const buffer = Buffer.from(bytes);
//   return iconv.decode(buffer, 'euc-kr');
// }

function getPayType(payMethod) {
  switch(payMethod) {
    case "CARD": return "PACA";
    case "BANK": return "PABK";
    case "VCNT": return "PAVC";
    case "MOBX": return "PAMC";
    case "TPNT": return "PAPT";
    case "GIFT": return "PATK";
    case "100000000000": return "PACA";
    case "010000000000": return "PABK";
    case "001000000000": return "PAVC";
    case "000010000000": return "PAMC";
    case "000100000000": return "PAPT";
    case "000000001000": return "PATK";
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
      requestApproveJson.site_cd = req.session.site_cd
      requestApproveJson.tran_cd = req.body.tran_cd
      requestApproveJson.ordr_no = req.session.ordr_idxx
      requestApproveJson.pay_type = getPayType(req.body.pay_method)
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
      responseApproveJson.good_name = req.session.good_name
      responseApproveJson.ordr_no = requestApproveJson.ordr_no
    } else {
      responseApproveJson.res_msg = req.body.res_msg
      responseApproveJson.res_cd = req.body.res_cd
      responseApproveJson.trace_no = req.body.trace_no
      responseApproveJson.Ret_URL = req.body.Ret_URL
      responseApproveJson.approval_key = req.body.approval_key
      responseApproveJson.ordr_idxx = req.body.ordr_idxx
    }

    req.session.destroy(err => {
      if (err) console.error(err)
    })

    res.redirect(`/KcpSendBox?${stringify(responseApproveJson)}`);
  } catch (err) {
    res.redirect(`/KcpSendBox?${stringify({ error: err.message })}`);
  }
})

app.post('/register', async (req, res) => {
  try {
    const requestRegisterJson = { ...req.body };
    requestRegisterJson.site_cd = "T0000";
    requestRegisterJson.kcp_cert_info = getKcpCertInfo();
    requestRegisterJson.Ret_URL = "http://localhost:3000/api/approve";
    requestRegisterJson.user_agent = "";
    requestRegisterJson.ordr_idxx = init_orderid();

    // KCP 거래 등록 API 요청
    const responseRegister = await axios.post(
      'https://stg-spl.kcp.co.kr/std/tradeReg/register',
      requestRegisterJson,
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        }
      }
    );

    const responseRegisterJson = { ...responseRegister.data };
    if(responseRegisterJson.Code === "0000") {
      responseRegisterJson.site_cd = requestRegisterJson.site_cd;
      responseRegisterJson.Ret_URL = requestRegisterJson.Ret_URL;
      responseRegisterJson.ordr_idxx = requestRegisterJson.ordr_idxx;
      responseRegisterJson.shop_name = "TEST SITE";
      responseRegisterJson.currency = "410"
      responseRegisterJson.quotaopt = "12";
      responseRegisterJson.buyr_name = "홍길동";
      responseRegisterJson.buyr_tel2 = "010-0000-0000";
      responseRegisterJson.buyr_mail = "test@test.co.kr";

      req.session.ordr_idxx = responseRegisterJson.ordr_idxx;
      req.session.site_cd  = responseRegisterJson.site_cd;
      req.session.good_name = requestRegisterJson.good_name;
      req.session.good_mny = requestRegisterJson.good_mny;
      req.session.save(err => {
        if (err) console.error(err)
      })
    } 

    return res.json(responseRegisterJson);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/info', async (req, res) => {
    const responseInfoJson = {};
    responseInfoJson.site_cd = "T0000";
    responseInfoJson.ordr_idxx = init_orderid();
    responseInfoJson.shop_name = "TEST SITE";
    responseInfoJson.currency = "410"
    responseInfoJson.quotaopt = "12";
    responseInfoJson.buyr_name = "홍길동";
    responseInfoJson.buyr_tel2 = "010-0000-0000";
    responseInfoJson.buyr_mail = "test@test.co.kr";

    req.session.ordr_idxx = responseInfoJson.ordr_idxx;
    req.session.site_cd = responseInfoJson.site_cd;
    req.session.good_name = req.body.good_name;
    req.session.good_mny = req.body.good_mny;
    req.session.save(err => {
      if (err) console.error(err)
    })

    return res.json(responseInfoJson);
});

module.exports = app