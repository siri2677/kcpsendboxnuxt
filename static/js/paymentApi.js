const express = require('express')
const router  = express.Router()
const axios = require('axios') 
const { stringify } = require('querystring')
const iconv = require('iconv-lite');

function saveSession(req, { ordr_idxx, site_cd, good_name, good_mny }) {
  Object.assign(req.session, { ordr_idxx, site_cd, good_name, good_mny });
  req.session.save(err => err && console.error(err));
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

// KCP 서비스 인증서
function getKcpCertInfo() {
  return "-----BEGIN CERTIFICATE-----MIIDgTCCAmmgAwIBAgIHBy4lYNG7ojANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJLUjEOMAwGA1UECAwFU2VvdWwxEDAOBgNVBAcMB0d1cm8tZ3UxFTATBgNVBAoMDE5ITktDUCBDb3JwLjETMBEGA1UECwwKSVQgQ2VudGVyLjEWMBQGA1UEAwwNc3BsLmtjcC5jby5rcjAeFw0yMTA2MjkwMDM0MzdaFw0yNjA2MjgwMDM0MzdaMHAxCzAJBgNVBAYTAktSMQ4wDAYDVQQIDAVTZW91bDEQMA4GA1UEBwwHR3Vyby1ndTERMA8GA1UECgwITG9jYWxXZWIxETAPBgNVBAsMCERFVlBHV0VCMRkwFwYDVQQDDBAyMDIxMDYyOTEwMDAwMDI0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAppkVQkU4SwNTYbIUaNDVhu2w1uvG4qip0U7h9n90cLfKymIRKDiebLhLIVFctuhTmgY7tkE7yQTNkD+jXHYufQ/qj06ukwf1BtqUVru9mqa7ysU298B6l9v0Fv8h3ztTYvfHEBmpB6AoZDBChMEua7Or/L3C2vYtU/6lWLjBT1xwXVLvNN/7XpQokuWq0rnjSRThcXrDpWMbqYYUt/CL7YHosfBazAXLoN5JvTd1O9C3FPxLxwcIAI9H8SbWIQKhap7JeA/IUP1Vk4K/o3Yiytl6Aqh3U1egHfEdWNqwpaiHPuM/jsDkVzuS9FV4RCdcBEsRPnAWHz10w8CX7e7zdwIDAQABox0wGzAOBgNVHQ8BAf8EBAMCB4AwCQYDVR0TBAIwADANBgkqhkiG9w0BAQsFAAOCAQEAg9lYy+dM/8Dnz4COc+XIjEwr4FeC9ExnWaaxH6GlWjJbB94O2L26arrjT2hGl9jUzwd+BdvTGdNCpEjOz3KEq8yJhcu5mFxMskLnHNo1lg5qtydIID6eSgew3vm6d7b3O6pYd+NHdHQsuMw5S5z1m+0TbBQkb6A9RKE1md5/Yw+NymDy+c4NaKsbxepw+HtSOnma/R7TErQ/8qVioIthEpwbqyjgIoGzgOdEFsF9mfkt/5k6rR0WX8xzcro5XSB3T+oecMS54j0+nHyoS96/llRLqFDBUfWn5Cay7pJNWXCnw4jIiBsTBa3q95RVRyMEcDgPwugMXPXGBwNoMOOpuQ==-----END CERTIFICATE-----";
}

// PC 결제시 결제 승인시 검증을 위해 데이터 세션에 저장
router.post('/store', async (req, res) => {
  saveSession(req, {
    ordr_idxx: req.body.ordr_idxx,
    site_cd: req.body.site_cd,
    good_name: req.body.good_name,
    good_mny: req.body.good_mny
  });

  res.status(200).json({"result" : "ok"});
});

// 모바일 결제시 거래 등록 진행, 결제 승인시 검증을 위해 데이터 세션에 저장
router.post('/register', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      kcp_cert_info: getKcpCertInfo()
    };

    const { data, config } = await axios.post(
      'https://stg-spl.kcp.co.kr/std/tradeReg/register',
      payload,
      { headers: { 'Content-Type': 'application/json; charset=UTF-8' } }
    );

    saveSession(req, {
      ordr_idxx: payload.ordr_idxx,
      site_cd: payload.site_cd,
      good_name: payload.good_name,
      good_mny: payload.good_mny
    });

    req.app.get('io').emit('registerResult', {
      ...data,
      requestUrl: config.url
    })

    res.status(200).json(data);
  } catch (err) {
    req.app.get('io').emit('registerResult', { 
      error: err.message 
    })

    res.status(500).json({ error: err.message });
  }
});

router.post('/approve', async (req, res) => {
  try {
    const { res_cd, res_msg, tran_cd, pay_method, enc_info, enc_data } = req.body || {};
    const { site_cd, ordr_idxx, good_name, good_mny } = req.session || {};

    let responseApproveJson = {};

    if (res_cd === "0000") {
      const { data, config } = await axios.post(
        'https://stg-spl.kcp.co.kr/gw/enc/v1/payment',
        {
          site_cd,
          tran_cd,
          enc_info,
          enc_data,
          kcp_cert_info: getKcpCertInfo(),
          ordr_no: ordr_idxx,
          ordr_mony: good_mny,
          pay_type: getPayType(pay_method),
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8',
          },
        }
      );

      responseApproveJson = {
        ...data,
        good_name,
        ordr_idxx,
        requestUrl: config.url,
      };
    } else {
      responseApproveJson = {
        res_msg: decodeEucKrUri(res_msg),
        res_cd,
        good_name,
        ordr_idxx,
        requestUrl: 'https://testsmpay.kcp.co.kr/'
      };
    }

    req.session.destroy(err => {
      if (err) console.error("Session destroy error:", err);
    });

    res.redirect(`/test?${stringify(responseApproveJson)}`);
  } catch (err) {
    res.redirect(`/test?${stringify({ error: err.message })}`);
  }
});

module.exports = router