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

function saveSession(req, { ordr_idxx, site_cd, good_name, good_mny }) {
  Object.assign(req.session, { ordr_idxx, site_cd, good_name, good_mny });
  req.session.save(err => err && console.error(err));
}

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
  const payTypeMap = {
    "CARD": "PACA", "100000000000": "PACA",
    "BANK": "PABK", "010000000000": "PABK",
    "VCNT": "PAVC", "001000000000": "PAVC",
    "MOBX": "PAMC", "000010000000": "PAMC",
    "TPNT": "PAPT", "000100000000": "PAPT",
    "GIFT": "PATK", "000000001000": "PATK"
  };

  return payTypeMap[payMethod] || null;
}

function getKcpCertInfo() {
  return "-----BEGIN CERTIFICATE-----MIIDgTCCAmmgAwIBAgIHBy4lYNG7ojANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJLUjEOMAwGA1UECAwFU2VvdWwxEDAOBgNVBAcMB0d1cm8tZ3UxFTATBgNVBAoMDE5ITktDUCBDb3JwLjETMBEGA1UECwwKSVQgQ2VudGVyLjEWMBQGA1UEAwwNc3BsLmtjcC5jby5rcjAeFw0yMTA2MjkwMDM0MzdaFw0yNjA2MjgwMDM0MzdaMHAxCzAJBgNVBAYTAktSMQ4wDAYDVQQIDAVTZW91bDEQMA4GA1UEBwwHR3Vyby1ndTERMA8GA1UECgwITG9jYWxXZWIxETAPBgNVBAsMCERFVlBHV0VCMRkwFwYDVQQDDBAyMDIxMDYyOTEwMDAwMDI0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAppkVQkU4SwNTYbIUaNDVhu2w1uvG4qip0U7h9n90cLfKymIRKDiebLhLIVFctuhTmgY7tkE7yQTNkD+jXHYufQ/qj06ukwf1BtqUVru9mqa7ysU298B6l9v0Fv8h3ztTYvfHEBmpB6AoZDBChMEua7Or/L3C2vYtU/6lWLjBT1xwXVLvNN/7XpQokuWq0rnjSRThcXrDpWMbqYYUt/CL7YHosfBazAXLoN5JvTd1O9C3FPxLxwcIAI9H8SbWIQKhap7JeA/IUP1Vk4K/o3Yiytl6Aqh3U1egHfEdWNqwpaiHPuM/jsDkVzuS9FV4RCdcBEsRPnAWHz10w8CX7e7zdwIDAQABox0wGzAOBgNVHQ8BAf8EBAMCB4AwCQYDVR0TBAIwADANBgkqhkiG9w0BAQsFAAOCAQEAg9lYy+dM/8Dnz4COc+XIjEwr4FeC9ExnWaaxH6GlWjJbB94O2L26arrjT2hGl9jUzwd+BdvTGdNCpEjOz3KEq8yJhcu5mFxMskLnHNo1lg5qtydIID6eSgew3vm6d7b3O6pYd+NHdHQsuMw5S5z1m+0TbBQkb6A9RKE1md5/Yw+NymDy+c4NaKsbxepw+HtSOnma/R7TErQ/8qVioIthEpwbqyjgIoGzgOdEFsF9mfkt/5k6rR0WX8xzcro5XSB3T+oecMS54j0+nHyoS96/llRLqFDBUfWn5Cay7pJNWXCnw4jIiBsTBa3q95RVRyMEcDgPwugMXPXGBwNoMOOpuQ==-----END CERTIFICATE-----";
}

app.post('/approve', async (req, res) => {
  try {
    const { res_cd, tran_cd, pay_method, enc_info, enc_data, res_msg, trace_no, Ret_URL, approval_key } = req.body || {};
    const { site_cd, ordr_idxx, good_name } = req.session || {};

    let responseApproveJson = {};

    if (res_cd === "0000") {
      const requestApproveJson = {
        site_cd,
        ordr_no: ordr_idxx,
        tran_cd,
        pay_type: getPayType(pay_method),
        enc_info,
        enc_data,
        kcp_cert_info: getKcpCertInfo(),
      };

      const responseApprovePost = await axios.post(
        'https://stg-spl.kcp.co.kr/gw/enc/v1/payment',
        requestApproveJson,
        {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8',
          },
        }
      );

      responseApproveJson = {
        ...responseApprovePost.data,
        action: "approve",
        good_name,
        ordr_no: ordr_idxx,
      };
    } else {
      responseApproveJson = {
        action: "paymentWindow",
        ...(res_msg ? { res_msg: decodeEucKrUri(res_msg) } : {}),
        ...(res_cd ? { res_cd } : {}),
        ...(trace_no ? { trace_no } : {}),
        ...(Ret_URL ? { Ret_URL } : {}),
        ...(approval_key ? { approval_key } : {}),
        ...(ordr_idxx ? { ordr_idxx } : {}),
      };
    }

    req.session.destroy(err => {
      if (err) console.error("Session destroy error:", err);
    });

    res.redirect(`/KcpSendBox?${stringify(responseApproveJson)}`);
  } catch (err) {
    res.redirect(`/KcpSendBox?${stringify({ error: err.message })}`);
  }
});

// 1) /info: 더미 데이터 생성
app.post('/info', (req, res) => {
  const info = {
    site_cd: "T0000",
    Ret_URL: "http://localhost:3000/api/approve",
    ordr_idxx: init_orderid(),
    shop_name: "TEST SITE",
    currency: "410",
    quotaopt: "12",
    buyr_name: "홍길동",
    buyr_tel2: "010-0000-0000",
    buyr_mail: "test@test.co.kr",

  };

  saveSession(req, {
    ordr_idxx: info.ordr_idxx,
    site_cd: info.site_cd,
    good_name: req.body.good_name,
    good_mny: req.body.good_mny
  });

  res.json(info);
});

// 2) /register: KCP API 호출 후 응답 정리
app.post('/register', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      site_cd: "T0000",
      Ret_URL: "http://localhost:3000/api/approve",
      ordr_idxx: init_orderid(),
      kcp_cert_info: getKcpCertInfo()
    };

    const { data } = await axios.post(
      'https://stg-spl.kcp.co.kr/std/tradeReg/register',
      payload,
      { headers: { 'Content-Type': 'application/json; charset=UTF-8' } }
    );

    const info = {
      ...data,
      action: "register",
      site_cd: payload.site_cd,
      Ret_URL: payload.Ret_URL,
      ordr_idxx: payload.ordr_idxx,
      shop_name: "TEST SITE",
      currency: "410",
      quotaopt: "12",
      buyr_name: "홍길동",
      buyr_tel2: "010-0000-0000",
      buyr_mail: "test@test.co.kr"
    };

    saveSession(req, {
      ordr_idxx: info.ordr_idxx,
      site_cd: info.site_cd,
      good_name: payload.good_name,
      good_mny: payload.good_mny
    });

    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app