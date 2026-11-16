/* ==========================================================================
   ふるさと納税 控除上限額・残り枠シミュレーター (html/assets/simulator.js)
   仕様書：site/02_simulator-spec.md / 基準データ：reference-log.md §2-2 完全準拠
   ・令和8年分の税制に基づき当サイトが試算した早見表（300万〜800万円・25万円刻み×3区分）ルックアップ方式
   ・中間年収の線形補間・独自推計は一切行わず、直近下位行へ切り捨てスナップ
   ・外部通信一切なし（ブラウザ内クライアント側JavaScriptのみで完結）
   ========================================================================== */
(function (global) {
  "use strict";

  var LOOKUP_TABLE = {
    "300": { single_or_dual: 28000,  married_single_income: 19000,  dual_with_highschool_child: 19000 },
    "325": { single_or_dual: 31000,  married_single_income: 22000,  dual_with_highschool_child: 22000 },
    "350": { single_or_dual: 34000,  married_single_income: 26000,  dual_with_highschool_child: 26000 },
    "375": { single_or_dual: 38000,  married_single_income: 29000,  dual_with_highschool_child: 29000 },
    "400": { single_or_dual: 42000,  married_single_income: 33000,  dual_with_highschool_child: 33000 },
    "425": { single_or_dual: 46000,  married_single_income: 37000,  dual_with_highschool_child: 37000 },
    "450": { single_or_dual: 49000,  married_single_income: 41000,  dual_with_highschool_child: 41000 },
    "475": { single_or_dual: 53000,  married_single_income: 45000,  dual_with_highschool_child: 45000 },
    "500": { single_or_dual: 58000,  married_single_income: 49000,  dual_with_highschool_child: 49000 },
    "525": { single_or_dual: 61000,  married_single_income: 53000,  dual_with_highschool_child: 53000 },
    "550": { single_or_dual: 69000,  married_single_income: 56000,  dual_with_highschool_child: 56000 },
    "575": { single_or_dual: 74000,  married_single_income: 61000,  dual_with_highschool_child: 61000 },
    "600": { single_or_dual: 77000,  married_single_income: 69000,  dual_with_highschool_child: 69000 },
    "625": { single_or_dual: 81000,  married_single_income: 73000,  dual_with_highschool_child: 73000 },
    "650": { single_or_dual: 86000,  married_single_income: 78000,  dual_with_highschool_child: 78000 },
    "675": { single_or_dual: 102000, married_single_income: 81000,  dual_with_highschool_child: 81000 },
    "700": { single_or_dual: 108000, married_single_income: 86000,  dual_with_highschool_child: 86000 },
    "725": { single_or_dual: 113000, married_single_income: 104000, dual_with_highschool_child: 104000 },
    "750": { single_or_dual: 118000, married_single_income: 109000, dual_with_highschool_child: 109000 },
    "775": { single_or_dual: 124000, married_single_income: 114000, dual_with_highschool_child: 114000 },
    "800": { single_or_dual: 129000, married_single_income: 120000, dual_with_highschool_child: 120000 }
  };

  var INCOME_KEYS = [
    300, 325, 350, 375, 400, 425, 450, 475,
    500, 525, 550, 575, 600, 625, 650, 675,
    700, 725, 750, 775, 800
  ];


  var LOOKUP_TABLE_WIDE = {
    "300": { single_or_dual: 28000, married_single_income: 19000, married_with_highschool_child: 11000, married_with_two_children: 2000 },
    "350": { single_or_dual: 34000, married_single_income: 26000, married_with_highschool_child: 17000, married_with_two_children: 5000 },
    "400": { single_or_dual: 42000, married_single_income: 33000, married_with_highschool_child: 25000, married_with_two_children: 12000 },
    "450": { single_or_dual: 49000, married_single_income: 41000, married_with_highschool_child: 33000, married_with_two_children: 20000 },
    "500": { single_or_dual: 58000, married_single_income: 49000, married_with_highschool_child: 41000, married_with_two_children: 28000 },
    "550": { single_or_dual: 69000, married_single_income: 56000, married_with_highschool_child: 48000, married_with_two_children: 35000 },
    "600": { single_or_dual: 77000, married_single_income: 69000, married_with_highschool_child: 56000, married_with_two_children: 43000 },
    "650": { single_or_dual: 86000, married_single_income: 78000, married_with_highschool_child: 69000, married_with_two_children: 52000 },
    "700": { single_or_dual: 108000, married_single_income: 86000, married_with_highschool_child: 77000, married_with_two_children: 63000 },
    "750": { single_or_dual: 119000, married_single_income: 110000, married_with_highschool_child: 87000, married_with_two_children: 74000 },
    "800": { single_or_dual: 130000, married_single_income: 121000, married_with_highschool_child: 111000, married_with_two_children: 83000 },
    "850": { single_or_dual: 143000, married_single_income: 133000, married_with_highschool_child: 124000, married_with_two_children: 108000 },
    "900": { single_or_dual: 156000, married_single_income: 147000, married_with_highschool_child: 137000, married_with_two_children: 122000 },
    "950": { single_or_dual: 170000, married_single_income: 160000, married_with_highschool_child: 151000, married_with_two_children: 136000 },
    "1000": { single_or_dual: 183000, married_single_income: 174000, married_with_highschool_child: 164000, married_with_two_children: 150000 },
    "1100": { single_or_dual: 220000, married_single_income: 204000, married_with_highschool_child: 194000, married_with_two_children: 181000 },
    "1200": { single_or_dual: 249000, married_single_income: 249000, married_with_highschool_child: 239000, married_with_two_children: 225000 },
    "1300": { single_or_dual: 277000, married_single_income: 277000, married_with_highschool_child: 267000, married_with_two_children: 253000 },
    "1500": { single_or_dual: 394000, married_single_income: 394000, married_with_highschool_child: 382000, married_with_two_children: 366000 },
    "1800": { single_or_dual: 497000, married_single_income: 497000, married_with_highschool_child: 485000, married_with_two_children: 469000 },
    "2000": { single_or_dual: 568000, married_single_income: 568000, married_with_highschool_child: 556000, married_with_two_children: 540000 }
  };

  var WIDE_KEYS = [300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1500, 1800, 2000];

  var FAMILY_LABELS = {
    single_or_dual: "独身・共働き",
    married_single_income: "夫婦（配偶者控除あり）",
    dual_with_highschool_child: "共働き＋子1人（高校生）",
    married_with_highschool_child: "夫婦＋子1人（高校生）",
    married_with_two_children: "夫婦＋子2人（大学生・高校生）"
  };

  function toHalfWidth(str) {
    return String(str)
      .replace(/[０-９]/g, function (ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      })
      .replace(/[，,]/g, "")
      .replace(/[\s\u3000]/g, "");
  }

  function parseDonatedAmount(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      return { valid: true, value: 0, errorMessage: "" };
    }
    var cleaned = toHalfWidth(raw);
    if (!/^\d+$/.test(cleaned)) {
      return {
        valid: false,
        value: 0,
        errorMessage: "寄附済み合計額には0以上の整数（半角・全角数字）を入力してください。現在は0円として計算しています。"
      };
    }
    var num = Math.floor(Number(cleaned));
    if (num > 99999999) {
      return {
        valid: false,
        value: 99999999,
        errorMessage: "寄附済み合計額は99,999,999円以下で入力してください。"
      };
    }
    return { valid: true, value: num, errorMessage: "" };
  }

  function parseIncomeMan(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      return { valid: false, value: NaN, errorMessage: "給与収入（万円）を入力してください。" };
    }
    var cleaned = toHalfWidth(raw);
    if (!/^\d+$/.test(cleaned)) {
      return { valid: false, value: NaN, errorMessage: "給与収入には正の整数（万円単位）を入力してください。" };
    }
    return { valid: true, value: Math.floor(Number(cleaned)), errorMessage: "" };
  }

  function formatYen(num) {
    return Number(num).toLocaleString("ja-JP");
  }

  function calculateFurusatoLimit(incomeManInput, familyType, donatedAmountInput) {
    var parsedDonated = parseDonatedAmount(donatedAmountInput);
    var donatedAmount = Math.max(0, parsedDonated.value);

    var safeFamily = FAMILY_LABELS[familyType] ? familyType : "single_or_dual";
    var incomeNum = Number(incomeManInput);

    if (!Number.isFinite(incomeNum) || isNaN(incomeNum)) {
      return {
        status: "INVALID_INCOME",
        message: "給与収入（万円）を正しく選択または入力してください。",
        donatedError: parsedDonated.errorMessage
      };
    }

    if (incomeNum < 300) {
      return {
        status: "UNDER_MIN_INCOME",
        inputIncomeMan: incomeNum,
        familyType: safeFamily,
        donatedAmount: donatedAmount,
        donatedError: parsedDonated.errorMessage,
        message: "給与収入300万円未満の目安は本早見表の対象外です。源泉徴収票や住民税決定通知書をもとに個別計算でご確認ください。"
      };
    }

    var useWide = incomeNum > 800 || safeFamily === "married_with_highschool_child" || safeFamily === "married_with_two_children";
    var isOverMaxIncome = incomeNum > 2000;
    var matchedIncomeNum, limitEstimate;
    if (useWide) {
      var capIncome = Math.min(2000, Math.floor(incomeNum));
      matchedIncomeNum = WIDE_KEYS[0];
      for (var wi = 0; wi < WIDE_KEYS.length; wi++) {
        if (WIDE_KEYS[wi] <= capIncome) matchedIncomeNum = WIDE_KEYS[wi];
      }
      var wideFamily = safeFamily === "dual_with_highschool_child" ? "married_single_income" : safeFamily;
      limitEstimate = LOOKUP_TABLE_WIDE[String(matchedIncomeNum)][wideFamily];
    } else {
      var clampedIncome = Math.min(800, Math.floor(incomeNum));
      matchedIncomeNum = Math.floor((clampedIncome - 300) / 25) * 25 + 300;
      limitEstimate = LOOKUP_TABLE[String(matchedIncomeNum)][safeFamily];
    }
    var isFlooredIntermediate = !isOverMaxIncome && matchedIncomeNum !== incomeNum;

    var remainingLimit = Math.max(0, limitEstimate - donatedAmount);
    var deductibleEstimateAtLimit = Math.max(0, limitEstimate - 2000);
    var exceededAmount = Math.max(0, donatedAmount - limitEstimate);
    var safeLimit = Math.floor(limitEstimate * 0.9 / 1000) * 1000;
    var safeRemaining = Math.max(0, safeLimit - donatedAmount);

    return {
      status: "OK",
      inputIncomeMan: incomeNum,
      matchedIncomeMan: matchedIncomeNum,
      isFlooredIntermediate: isFlooredIntermediate,
      isOverMaxIncome: isOverMaxIncome,
      familyType: safeFamily,
      familyLabel: FAMILY_LABELS[safeFamily],
      limitEstimate: limitEstimate,
      safeLimit: safeLimit,
      safeRemaining: safeRemaining,
      capIncomeMan: 2000,
      isWideRange: useWide,
      donatedAmount: donatedAmount,
      remainingLimit: remainingLimit,
      selfBurden: 2000,
      deductibleEstimateAtLimit: deductibleEstimateAtLimit,
      exceededAmount: exceededAmount,
      donatedError: parsedDonated.errorMessage
    };
  }

  function mountSimulator(container) {
    if (!container || container.getAttribute("data-sim-mounted") === "true") return;
    container.setAttribute("data-sim-mounted", "true");

    var prefix = container.getAttribute("data-base-prefix") || "";
    var uid = "sim-" + Math.random().toString(36).slice(2, 8);
    var mode = "select"; // "select" or "custom"

    var optionsHtml = INCOME_KEYS.map(function (val) {
      var sel = val === 500 ? " selected" : "";
      return '<option value="' + val + '"' + sel + '>給与収入 ' + val + '万円（' + formatYen(val * 10000) + '円）</option>';
    }).join("");

    container.innerHTML =
      '<div class="sim-widget">' +
        '<div class="sim-fields-grid" role="group" aria-label="控除上限額・残り枠シミュレーター入力">' +
          '<div class="sim-field-box">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
              '<label class="lab" for="' + uid + '-income-select" style="margin-bottom:0;">① 当年の給与収入（額面見込み）</label>' +
              '<div class="mode-tabs" role="tablist" aria-label="年収の指定方法">' +
                '<button type="button" class="active" data-mode="select" role="tab" aria-selected="true">25万円刻みから選択</button>' +
                '<button type="button" data-mode="custom" role="tab" aria-selected="false">任意の万円を入力</button>' +
              '</div>' +
            '</div>' +
            '<div data-pane="select">' +
              '<select id="' + uid + '-income-select" name="income_man">' + optionsHtml + '</select>' +
            '</div>' +
            '<div data-pane="custom" style="display:none;">' +
              '<div class="sim-input-row">' +
                '<input type="text" inputmode="numeric" id="' + uid + '-income-custom" value="500" placeholder="例：500（または460など）" aria-label="当年の給与収入（万円）">' +
                '<span class="sim-input-unit">万円</span>' +
              '</div>' +
            '</div>' +
            '<p class="hint">※手取り額ではなく、税金や社会保険料が引かれる前の『額面の年間給与収入（1月1日〜12月31日の見込み）』を選びます。表にない中間の年収（例：460万円など）の場合は、補間せず<strong>直近下位の行</strong>（例：450万円）を選んでご確認ください。</p>' +
          '</div>' +

          '<div class="sim-field-box">' +
            '<span class="lab">② 家族構成（税制上の扶養区分）</span>' +
            '<div class="radio-list three-col">' +
              '<label>' +
                '<input type="radio" name="' + uid + '-family" value="single_or_dual" checked>' +
                '<span>独身 または 共働き<span class="radio-sub">本人に配偶者控除・扶養控除の適用がない場合（中学生以下の子のみの場合を含む一般的な区分）</span></span>' +
              '</label>' +
              '<label>' +
                '<input type="radio" name="' + uid + '-family" value="married_single_income">' +
                '<span>夫婦（配偶者控除あり）<span class="radio-sub">配偶者に収入がなく、配偶者控除が適用される場合</span></span>' +
              '</label>' +
              '<label>' +
                '<input type="radio" name="' + uid + '-family" value="dual_with_highschool_child">' +
                '<span>共働き＋子1人（高校生）<span class="radio-sub">共働き（配偶者控除なし）で、高校生（16〜18歳）の扶養親族が1人いる場合</span></span>' +
              '</label>' +
              '<label>' +
                '<input type="radio" name="' + uid + '-family" value="married_with_highschool_child">' +
                '<span>夫婦＋子1人（高校生）<span class="radio-sub">配偶者控除ありで、高校生（16〜18歳）の扶養親族が1人いる場合（拡張表で試算）</span></span>' +
              '</label>' +
              '<label>' +
                '<input type="radio" name="' + uid + '-family" value="married_with_two_children">' +
                '<span>夫婦＋子2人（大学生・高校生）<span class="radio-sub">配偶者控除ありで、大学生（19〜22歳）と高校生の扶養親族がいる場合（拡張表で試算）</span></span>' +
              '</label>' +
            '</div>' +
            '<p class="hint">※「夫婦＋子1人（高校生）」「夫婦＋子2人（大学生・高校生）」と年収800万円超は、令和8年分の税制に基づく当サイト試算の拡張表（50万円刻み・2,000万円まで）から直近下位の行を表示します。16歳未満のお子さんは扶養控除の対象にならないため、その場合は「夫婦」（独身の方は「独身 または 共働き」）の区分をご覧ください。</p>' +
          '</div>' +

          '<div class="sim-field-box">' +
            '<label class="lab" for="' + uid + '-donated">③ 今年の寄附済み合計額（任意）</label>' +
            '<div class="sim-input-row">' +
              '<input type="text" inputmode="numeric" id="' + uid + '-donated" name="donated_amount" value="0" placeholder="0">' +
              '<span class="sim-input-unit">円</span>' +
            '</div>' +
            '<div class="sim-presets" aria-label="寄附済み額クイック入力">' +
              '<button type="button" class="sim-preset-btn" data-donated="0">0円（未寄附）</button>' +
              '<button type="button" class="sim-preset-btn" data-donated="10000">10,000円</button>' +
              '<button type="button" class="sim-preset-btn" data-donated="20000">20,000円</button>' +
              '<button type="button" class="sim-preset-btn" data-donated="30000">30,000円</button>' +
              '<button type="button" class="sim-preset-btn" data-donated="50000">50,000円</button>' +
            '</div>' +
            '<p class="hint">※その年の1月1日以降に決済完了したふるさと納税の合計額（円）を入力すると、目安の残り枠を計算します。未寄附の場合は0円のままで構いません。</p>' +
          '</div>' +
        '</div>' +

        '<div class="sim-result-wrap" aria-live="polite">' +
          '<div data-role="error-box"></div>' +
          '<div data-role="main-output"></div>' +
          '<div class="disclaimer">' +
            '<h3>前提条件・公的確認の必須注記</h3>' +
            '<ul>' +
              '<li>※本シミュレーターの金額は、令和8年分（2026年分）の税制に基づき当サイトが試算した早見表に基づく、<strong>給与収入のみ・他の控除（iDeCo・医療費控除・住宅ローン控除等）がない場合の目安</strong>です（前提：東京都・協会けんぽ・39歳以下・賞与なし）。</li>' +
              '<li>※表にない中間の年収は補間せず<strong>直近下位の行の値</strong>を参照します。</li>' +
              '<li>※正確な控除限度額は、お手元の源泉徴収票・住民税決定通知書をご確認のうえ、お住まいの自治体にてご確認ください（計算式の詳細は「<a href="' + prefix + 'keisan/index.html">限度額の計算方法と源泉徴収票での確認</a>」へ）。</li>' +
              '<li>※個人事業主の方（「<a href="' + prefix + 'kojin-jigyo/index.html">個人事業主の限度額の考え方</a>」）、年金受給者の方（「<a href="' + prefix + 'nenkin/index.html">年金受給者の限度額の考え方</a>」）、iDeCoや住宅ローン控除等を併用される方（「<a href="' + prefix + 'ideco/index.html">iDeCo併用時の影響</a>」／「<a href="' + prefix + 'jutaku-loan/index.html">住宅ローン控除との併用</a>」）は計算条件が異なります。</li>' +
            '</ul>' +
            '<p class="privacy">※入力データはお使いの端末（ブラウザ内）でのみ計算され、外部へ送信・保存されません。</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var selectEl = container.querySelector("#" + uid + "-income-select");
    var customEl = container.querySelector("#" + uid + "-income-custom");
    var donatedEl = container.querySelector("#" + uid + "-donated");
    var selectPane = container.querySelector('[data-pane="select"]');
    var customPane = container.querySelector('[data-pane="custom"]');
    var modeBtns = container.querySelectorAll(".mode-tabs button");
    var familyRadios = container.querySelectorAll('input[name="' + uid + '-family"]');
    var presetBtns = container.querySelectorAll(".sim-preset-btn");
    var errorBox = container.querySelector('[data-role="error-box"]');
    var mainOutput = container.querySelector('[data-role="main-output"]');

    function getSelectedFamily() {
      for (var i = 0; i < familyRadios.length; i++) {
        if (familyRadios[i].checked) return familyRadios[i].value;
      }
      return "single_or_dual";
    }

    function render() {
      var incomeVal;
      var incomeParseErr = "";
      if (mode === "select") {
        incomeVal = Number(selectEl.value);
      } else {
        var parsedInc = parseIncomeMan(customEl.value);
        if (!parsedInc.valid) {
          incomeParseErr = parsedInc.errorMessage;
          incomeVal = NaN;
        } else {
          incomeVal = parsedInc.value;
        }
      }

      var familyVal = getSelectedFamily();
      var res = calculateFurusatoLimit(incomeVal, familyVal, donatedEl.value);

      var errors = [];
      if (incomeParseErr) errors.push(incomeParseErr);
      if (res.donatedError) errors.push(res.donatedError);

      errorBox.innerHTML = errors.length
        ? '<p class="sim-error-note">' + errors.join("<br>") + '</p>'
        : "";

      if (res.status === "INVALID_INCOME") {
        mainOutput.innerHTML =
          '<div class="sim-snap-note">給与収入（万円）を入力すると、控除上限額の目安と今年の残り枠を表示します。</div>';
        return;
      }

      if (res.status === "UNDER_MIN_INCOME") {
        mainOutput.innerHTML =
          '<div class="sim-exceeded-alert">' +
            '<div class="sim-exceeded-alert-title">早見表の対象範囲外（300万円未満）</div>' +
            '<p style="margin:0;">' + res.message + ' 詳しくは「<a href="' + prefix + 'keisan/index.html">限度額の計算方法と源泉徴収票での確認</a>」をご覧ください。</p>' +
          '</div>';
        return;
      }

      var snapNoteHtml = "";
      if (res.isOverMaxIncome) {
        snapNoteHtml =
          '<p class="sim-snap-note">※入力年収（' + formatYen(res.inputIncomeMan) + '万円）は本早見表の上限を超えるため、上限である<strong>' + res.capIncomeMan + '万円行</strong>の試算値を参考表示しています。詳しい確認は「<a href="' + prefix + 'keisan/index.html">限度額の計算方法と源泉徴収票での確認</a>」をご参照ください。</p>';
      } else if (res.isFlooredIntermediate) {
        snapNoteHtml =
          '<p class="sim-snap-note">※入力年収（' + formatYen(res.inputIncomeMan) + '万円）に対し、補間せず直近下位である<strong>' + res.matchedIncomeMan + '万円行</strong>の試算値を表示しています。</p>';
      }

      var donatedPct = res.limitEstimate > 0
        ? Math.min(100, Math.round((res.donatedAmount / res.limitEstimate) * 100))
        : 0;
      var remainPct = Math.max(0, 100 - donatedPct);

      var exceededHtml = "";
      if (res.donatedAmount > res.limitEstimate) {
        exceededHtml =
          '<div class="sim-exceeded-alert" role="alert">' +
            '<div class="sim-exceeded-alert-title">目安超過に関するご注意（超過目安：' + formatYen(res.exceededAmount) + ' 円）</div>' +
            '<p style="margin:0;">寄附済み額が早見表の目安額を <strong>' + formatYen(res.exceededAmount) + ' 円</strong>上回っています。上限目安を超えた分も寄附金控除の対象にはなりますが、全額控除にはならず自己負担が2,000円を超えます。なお、限度額を超過した場合はワンストップ特例より確定申告の方が（所得税からも控除されるため）控除範囲が広くなります。詳しくは「<a href="' + prefix + 'kakutei/index.html">確定申告での控除の受け方と超過分の扱い</a>」をご確認ください。</p>' +
          '</div>';
      }

      var safeHtml =
        '<div class="sim-self-burden-box">' +
          '<p><strong>安全圏の目安（上限の9割）：' + formatYen(res.safeLimit) + ' 円</strong>（あと ' + formatYen(res.safeRemaining) + ' 円まで）。年収見込みが年末に下振れすると上限額も下がります。寄附総額をこの水準までに抑えておくと、上限超過で自己負担が増えるリスクを抑えられます。</p>' +
        '</div>';

      var splitPlanHtml = "";
      if (res.remainingLimit > 0) {
        var splitExample = "";
        if (res.remainingLimit >= 50000) {
          var perMuni = Math.floor(res.remainingLimit / 4000) * 1000;
          var fourth = res.remainingLimit - perMuni * 3;
          splitExample = "配分イメージ例（ワンストップ5自治体以内の場合）：<strong>" + formatYen(perMuni) + "円 × 3自治体 ＋ " + formatYen(fourth) + "円 × 1自治体（計4自治体）</strong> など、上限を超えない範囲で端数を調整しやすくなります。";
        } else if (res.remainingLimit >= 20000) {
          var unit10k = Math.floor(res.remainingLimit / 10000);
          var rem = res.remainingLimit - unit10k * 10000;
          splitExample = "配分イメージ例（ワンストップ5自治体以内の場合）：<strong>10,000円 × " + unit10k + "自治体" + (rem > 0 ? " ＋ " + formatYen(rem) + "円以内 × 1自治体" : "") + "</strong> のように分けると自治体数を管理しやすくなります。";
        } else {
          splitExample = "配分イメージ例：残り枠（目安 <strong>" + formatYen(res.remainingLimit) + " 円</strong>）の範囲内で、5,000円〜10,000円前後の寄附金額帯から1〜2自治体に絞って確認すると上限超過を防ぎやすくなります。";
        }
        splitPlanHtml =
          '<aside class="pr-box" aria-label="プロモーション案内" style="margin-top:14px;">' +
            '<div class="pr-box-head"><span class="pr-badge">【#PR】</span>試算した残り枠（目安 ' + formatYen(res.remainingLimit) + ' 円）で寄附先・金額帯を確認する</div>' +
            '<p>' + splitExample + '（※当年分は12月31日決済完了分まで／ワンストップ特例は5自治体以内・翌年1月10日必着）</p>' +
            '<div class="pr-slot-group">' +
              '<a class="pr-slot" href="https://hb.afl.rakuten.co.jp/hgc/11e7c15e.43b4d992.11e7c15f.7b1e602a/?pc=https%3A%2F%2Fevent.rakuten.co.jp%2Ffurusato%2F&amp;link_type=text&amp;ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9" target="_blank" rel="nofollow sponsored noopener">楽天ふるさと納税で寄附先を探す</a>' +
            '</div>' +
          '</aside>';
      }

      mainOutput.innerHTML =
        '<div class="result-grid-2">' +
          '<div class="result-head">' +
            '<div class="cap">① 控除上限額の目安（年間合計）</div>' +
            '<div class="total" data-testid="limit-estimate">' + formatYen(res.limitEstimate) + ' 円</div>' +
            '<div class="mid">参照条件：給与収入 ' + res.matchedIncomeMan + '万円 ／ ' + res.familyLabel + '</div>' +
          '</div>' +
          '<div class="result-head is-remaining">' +
            '<div class="cap">② 今年の残り寄附枠（目安）</div>' +
            '<div class="total" data-testid="remaining-limit">' + formatYen(res.remainingLimit) + ' 円</div>' +
            '<div class="mid">目安 ' + formatYen(res.limitEstimate) + '円 − 寄附済み ' + formatYen(res.donatedAmount) + '円（下限0円）</div>' +
          '</div>' +
        '</div>' +
        snapNoteHtml +
        '<div class="bar" aria-label="寄附済み額と残り寄附枠の割合">' +
          '<div class="b1" style="width:' + donatedPct + '%;" title="寄附済み額"></div>' +
          '<div class="b2" style="width:' + remainPct + '%;" title="残り寄附枠"></div>' +
        '</div>' +
        '<div class="legend">' +
          '<span class="l1">今年の寄附済み額：' + formatYen(res.donatedAmount) + ' 円</span>' +
          '<span class="l2">今年の残り寄附枠（目安）：' + formatYen(res.remainingLimit) + ' 円</span>' +
        '</div>' +
        exceededHtml +
        '<div class="sim-self-burden-box">' +
          '<p>ふるさと納税では、年間の寄附合計額のうち<strong>2,000円が自己負担</strong>となり、2,000円を超える部分（上記の上限目安 <strong>' + formatYen(res.limitEstimate) + ' 円</strong>まで寄附した場合は <strong data-testid="deductible-estimate">' + formatYen(res.deductibleEstimateAtLimit) + ' 円</strong>）が所得税と住民税から原則として全額控除されます。自己負担2,000円は寄附1件ごとではなく、1年間（1月1日〜12月31日）の寄附合計に対する負担額です。</p>' +
        '</div>' +
        safeHtml +
        splitPlanHtml;
    }

    for (var m = 0; m < modeBtns.length; m++) {
      modeBtns[m].addEventListener("click", function () {
        var nextMode = this.getAttribute("data-mode");
        mode = nextMode;
        for (var k = 0; k < modeBtns.length; k++) {
          var isAct = modeBtns[k].getAttribute("data-mode") === mode;
          modeBtns[k].classList.toggle("active", isAct);
          modeBtns[k].setAttribute("aria-selected", isAct ? "true" : "false");
        }
        if (mode === "select") {
          selectPane.style.display = "";
          customPane.style.display = "none";
          var parsed = parseIncomeMan(customEl.value);
          if (parsed.valid && parsed.value >= 300 && parsed.value <= 800) {
            var snapped = Math.floor((parsed.value - 300) / 25) * 25 + 300;
            selectEl.value = String(snapped);
          }
        } else {
          selectPane.style.display = "none";
          customPane.style.display = "";
          customEl.value = selectEl.value;
          customEl.focus();
        }
        render();
      });
    }

    selectEl.addEventListener("change", render);
    customEl.addEventListener("input", render);
    donatedEl.addEventListener("input", render);
    for (var r = 0; r < familyRadios.length; r++) {
      familyRadios[r].addEventListener("change", render);
    }
    for (var p = 0; p < presetBtns.length; p++) {
      presetBtns[p].addEventListener("click", function () {
        donatedEl.value = this.getAttribute("data-donated");
        render();
      });
    }

    // External preset trigger support (for Case 1-5 quick verification buttons on /simulator/)
    container._applyPreset = function (incMan, famType, donatedVal, useCustomMode) {
      if (useCustomMode) {
        mode = "custom";
        selectPane.style.display = "none";
        customPane.style.display = "";
        customEl.value = String(incMan);
      } else {
        mode = "select";
        selectPane.style.display = "";
        customPane.style.display = "none";
        selectEl.value = String(incMan);
        customEl.value = String(incMan);
      }
      for (var k = 0; k < modeBtns.length; k++) {
        var isAct = modeBtns[k].getAttribute("data-mode") === mode;
        modeBtns[k].classList.toggle("active", isAct);
        modeBtns[k].setAttribute("aria-selected", isAct ? "true" : "false");
      }
      for (var j = 0; j < familyRadios.length; j++) {
        familyRadios[j].checked = familyRadios[j].value === famType;
      }
      donatedEl.value = String(donatedVal);
      render();
    };

    render();
  }

  function initAll() {
    if (typeof document === "undefined") return;
    var targets = document.querySelectorAll(".js-furusato-sim");
    for (var i = 0; i < targets.length; i++) {
      mountSimulator(targets[i]);
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initAll);
    } else {
      initAll();
    }
  }

  var api = {
    LOOKUP_TABLE: LOOKUP_TABLE,
    LOOKUP_TABLE_WIDE: LOOKUP_TABLE_WIDE,
    INCOME_KEYS: INCOME_KEYS,
    FAMILY_LABELS: FAMILY_LABELS,
    calculateFurusatoLimit: calculateFurusatoLimit,
    parseDonatedAmount: parseDonatedAmount,
    parseIncomeMan: parseIncomeMan,
    mountSimulator: mountSimulator
  };

  global.FurusatoSimulator = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
