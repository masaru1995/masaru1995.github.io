/* ==========================================================================
   車検費用シミュレーター 算出ロジック & UIコントローラー (html/assets/simulator.js)
   正本仕様: site/02_simulator-spec.md / reference-log.md §2・§3
   ========================================================================== */
(function (root) {
  "use strict";

  var WEIGHT_TAX_TABLE = {
    kei_fixed: { label: "軽自動車（定額）", under_13: 6600, over_13: 8200, over_18: 8800 },
    le_0_5t:   { label: "普通車 〜0.5t（500kg以下）", under_13: 8200, over_13: 8200, over_18: 8200 },
    le_1_0t:   { label: "普通車 〜1.0t（501〜1,000kg）", under_13: 16400, over_13: 22800, over_18: 25200 },
    le_1_5t:   { label: "普通車 〜1.5t（1,001〜1,500kg）", under_13: 24600, over_13: 34200, over_18: 37800 },
    le_2_0t:   { label: "普通車 〜2.0t（1,501〜2,000kg）", under_13: 32800, over_13: 45600, over_18: 50400 },
    le_2_5t:   { label: "普通車 〜2.5t（2,001〜2,500kg）", under_13: 41000, over_13: 57000, over_18: 63000 }
  };

  var TOTAL_RANGE_TABLE = {
    kei_fixed: { min: 60000,  max: 90000,  label: "6万〜9万円（目安）" },
    le_0_5t:   { min: null,   max: null,   label: "車両条件・依頼先ごとの個別見積もりでご確認ください（要出典確認）" },
    le_1_0t:   { min: 80000,  max: 120000, label: "8万〜12万円（目安）" },
    le_1_5t:   { min: 90000,  max: 140000, label: "9万〜14万円（目安）" },
    le_2_0t:   { min: 100000, max: 160000, label: "10万〜16万円（目安）" },
    le_2_5t:   { min: null,   max: null,   label: "車両条件・依頼先ごとの個別見積もりでご確認ください（要出典確認）" }
  };

  var AGE_LABELS = {
    under_13: "13年未満",
    over_13: "13年経過（13年以上18年未満）",
    over_18: "18年経過（18年以上）"
  };

  function formatYen(num) {
    return Number(num).toLocaleString("ja-JP") + "円";
  }

  function formatApproxMan(yen) {
    return (Math.round(yen / 1000) / 10).toFixed(1);
  }

  function calculateShakenCost(params) {
    var category = params && params.category === "kei" ? "kei" : "ordinary";
    var weightBand = category === "kei" ? "kei_fixed" : (params && params.weightBand ? params.weightBand : "le_1_5t");
    if (category === "ordinary" && (!WEIGHT_TAX_TABLE[weightBand] || weightBand === "kei_fixed")) {
      weightBand = "le_1_5t";
    }
    var ageBand = params && AGE_LABELS[params.ageBand] ? params.ageBand : "under_13";

    var taxRow = WEIGHT_TAX_TABLE[weightBand];
    var weightTax = taxRow[ageBand];
    var baseWeightTax = taxRow.under_13;
    var weightTaxSurchargeDiff = weightTax - baseWeightTax;

    var jibaisekiFee = category === "kei" ? 18660 : 18560;
    var jibaiseki25m = category === "kei" ? 18040 : 18160;
    var inspectionFee = 1800;
    var legalFeeTotal = weightTax + jibaisekiFee + inspectionFee;

    var ageSurchargeUnverified = (weightBand === "le_0_5t" && ageBand !== "under_13");
    var isAgedVehicle = (ageBand !== "under_13");

    var totalInfo = TOTAL_RANGE_TABLE[weightBand];
    var hasTotalEstimate = totalInfo.min !== null && totalInfo.max !== null;
    var variableMin = hasTotalEstimate ? (totalInfo.min - legalFeeTotal) : null;
    var variableMax = hasTotalEstimate ? (totalInfo.max - legalFeeTotal) : null;

    var variableApproxText = hasTotalEstimate
      ? ("約" + formatApproxMan(variableMin) + "万〜" + formatApproxMan(variableMax) + "万円前後")
      : null;
    var variableExactText = hasTotalEstimate
      ? (formatYen(variableMin) + "〜" + formatYen(variableMax))
      : null;

    return {
      category: category,
      categoryLabel: category === "kei" ? "軽自動車" : "普通自動車（小型・普通乗用車）",
      weightBand: weightBand,
      weightLabel: taxRow.label,
      ageBand: ageBand,
      ageLabel: AGE_LABELS[ageBand],
      weightTax: weightTax,
      weightTaxSurchargeDiff: weightTaxSurchargeDiff,
      jibaisekiFee: jibaisekiFee,
      jibaiseki25m: jibaiseki25m,
      inspectionFee: inspectionFee,
      legalFeeTotal: legalFeeTotal,
      hasTotalEstimate: hasTotalEstimate,
      totalMin: totalInfo.min,
      totalMax: totalInfo.max,
      totalLabel: totalInfo.label,
      variableMin: variableMin,
      variableMax: variableMax,
      variableApproxText: variableApproxText,
      variableExactText: variableExactText,
      ageSurchargeUnverified: ageSurchargeUnverified,
      isAgedVehicle: isAgedVehicle
    };
  }

  function initSimulatorDOM() {
    var rootEl = document.getElementById("shaken-simulator-app");
    if (!rootEl) return;

    var categoryInputs = rootEl.querySelectorAll('input[name="category"]');
    var weightSelect = document.getElementById("sim-weight-band");
    var weightFixedNotice = document.getElementById("sim-weight-kei-note");
    var ageInputs = rootEl.querySelectorAll('input[name="ageBand"]');
    var presetBtns = rootEl.querySelectorAll(".preset-btn");

    var elConditionBadge = document.getElementById("res-condition-badge");
    var elLegalTotal = document.getElementById("res-legal-total");
    var elTotalEstimate = document.getElementById("res-total-estimate");
    var elWarnUnverified = document.getElementById("res-warn-unverified");
    var elWarnAged = document.getElementById("res-warn-aged");

    var elBarTax = document.getElementById("bar-tax");
    var elBarIns = document.getElementById("bar-ins");
    var elBarVar = document.getElementById("bar-var");
    var elBarCaption = document.getElementById("bar-caption");

    var elLegalSum = document.getElementById("bd-legal-sum");
    var elDetailTax = document.getElementById("bd-tax");
    var elDetailJibaiseki = document.getElementById("bd-jibaiseki");
    var elDetailInspection = document.getElementById("bd-inspection");
    var elJibaiseki25Note = document.getElementById("bd-jibaiseki-25m");

    var elVariableAmt = document.getElementById("bd-variable-amt");
    var elVariableExact = document.getElementById("bd-variable-exact");

    var lastOrdinaryWeight = "le_1_5t";

    function getSelectedRadio(nodeList, fallback) {
      for (var i = 0; i < nodeList.length; i++) {
        if (nodeList[i].checked) return nodeList[i].value;
      }
      return fallback;
    }

    function setRadioValue(nodeList, val) {
      for (var i = 0; i < nodeList.length; i++) {
        nodeList[i].checked = (nodeList[i].value === val);
      }
    }

    function syncWeightUI(category) {
      if (!weightSelect) return;
      if (category === "kei") {
        if (weightSelect.value !== "kei_fixed") {
          lastOrdinaryWeight = weightSelect.value || "le_1_5t";
        }
        var keiOptExists = false;
        for (var i = 0; i < weightSelect.options.length; i++) {
          var opt = weightSelect.options[i];
          if (opt.value === "kei_fixed") {
            opt.disabled = false;
            opt.hidden = false;
            keiOptExists = true;
          } else {
            opt.disabled = true;
            opt.hidden = true;
          }
        }
        if (keiOptExists) weightSelect.value = "kei_fixed";
        weightSelect.disabled = true;
        if (weightFixedNotice) weightFixedNotice.style.display = "block";
      } else {
        weightSelect.disabled = false;
        for (var j = 0; j < weightSelect.options.length; j++) {
          var opt2 = weightSelect.options[j];
          if (opt2.value === "kei_fixed") {
            opt2.disabled = true;
            opt2.hidden = true;
          } else {
            opt2.disabled = false;
            opt2.hidden = false;
          }
        }
        if (weightSelect.value === "kei_fixed" || !weightSelect.value) {
          weightSelect.value = lastOrdinaryWeight || "le_1_5t";
        }
        if (weightFixedNotice) weightFixedNotice.style.display = "none";
      }
    }

    function updateActivePreset(category, weightBand, ageBand) {
      for (var i = 0; i < presetBtns.length; i++) {
        var b = presetBtns[i];
        var match =
          b.getAttribute("data-cat") === category &&
          b.getAttribute("data-weight") === weightBand &&
          b.getAttribute("data-age") === ageBand;
        b.classList.toggle("is-active", match);
      }
    }

    function render() {
      var category = getSelectedRadio(categoryInputs, "ordinary");
      syncWeightUI(category);
      var weightBand = category === "kei" ? "kei_fixed" : (weightSelect ? weightSelect.value : "le_1_5t");
      if (category === "ordinary") {
        lastOrdinaryWeight = weightBand;
      }
      var ageBand = getSelectedRadio(ageInputs, "under_13");

      var res = calculateShakenCost({
        category: category,
        weightBand: weightBand,
        ageBand: ageBand
      });

      updateActivePreset(res.category, res.weightBand, res.ageBand);

      if (elConditionBadge) {
        elConditionBadge.textContent = res.weightLabel + " ／ " + res.ageLabel;
      }
      if (elLegalTotal) {
        elLegalTotal.textContent = formatYen(res.legalFeeTotal) + (res.ageSurchargeUnverified ? " ※" : "");
      }

      if (elTotalEstimate) {
        elTotalEstimate.textContent = res.totalLabel;
        elTotalEstimate.classList.toggle("is-unverified", !res.hasTotalEstimate);
      }

      if (elWarnUnverified) {
        if (res.ageSurchargeUnverified) {
          elWarnUnverified.textContent = "【要確認】13年未満の額（8,200円）で表示しています。〜0.5t区分の13年経過・18年経過時の増額分は要出典確認のため、国土交通省の重量税額表または車検依頼先でご確認ください。";
          elWarnUnverified.classList.add("show");
        } else {
          elWarnUnverified.classList.remove("show");
        }
      }

      if (elWarnAged) {
        if (res.isAgedVehicle) {
          var diffPart = (!res.ageSurchargeUnverified && res.weightTaxSurchargeDiff > 0)
            ? ("（重量税は13年未満比で +" + formatYen(res.weightTaxSurchargeDiff) + "）")
            : "";
          elWarnAged.textContent = "【経年車の注意点】経年車は重量税の重課" + diffPart + "に加え、消耗部品の交換整備により一般的な総額目安より上振れしやすいため、事前見積もりでの内訳確認が重要です。";
          elWarnAged.classList.add("show");
        } else {
          elWarnAged.classList.remove("show");
        }
      }

      // Breakdown ratio bar
      if (elBarTax && elBarIns && elBarVar) {
        var insPlusFee = res.jibaisekiFee + res.inspectionFee;
        if (res.hasTotalEstimate) {
          var midTotal = (res.totalMin + res.totalMax) / 2;
          var midVar = Math.max(0, midTotal - res.legalFeeTotal);
          var pTax = Math.round((res.weightTax / midTotal) * 1000) / 10;
          var pIns = Math.round((insPlusFee / midTotal) * 1000) / 10;
          var pVar = Math.max(5, Math.round((midVar / midTotal) * 1000) / 10);
          elBarTax.style.width = pTax + "%";
          elBarIns.style.width = pIns + "%";
          elBarVar.style.width = pVar + "%";
          elBarVar.style.display = "block";
          if (elBarCaption) {
            elBarCaption.textContent = "総額目安の中間値に対する構成イメージ（紺＝法定費用合計 " + formatYen(res.legalFeeTotal) + " ／ オレンジ＝基本料＋整備費の目安幅）";
          }
        } else {
          var pTaxOnly = Math.round((res.weightTax / res.legalFeeTotal) * 1000) / 10;
          var pInsOnly = Math.round((insPlusFee / res.legalFeeTotal) * 1000) / 10;
          elBarTax.style.width = pTaxOnly + "%";
          elBarIns.style.width = pInsOnly + "%";
          elBarVar.style.width = "0%";
          elBarVar.style.display = "none";
          if (elBarCaption) {
            elBarCaption.textContent = "法定費用合計（" + formatYen(res.legalFeeTotal) + "）の内訳比率（総額目安は個別見積もりで確認）";
          }
        }
      }

      if (elLegalSum) {
        elLegalSum.textContent = formatYen(res.legalFeeTotal);
      }
      if (elDetailTax) {
        elDetailTax.textContent = formatYen(res.weightTax) + (res.ageSurchargeUnverified ? "（13年未満額を表示・要確認）" : "");
      }
      if (elDetailJibaiseki) {
        elDetailJibaiseki.textContent = formatYen(res.jibaisekiFee);
      }
      if (elDetailInspection) {
        elDetailInspection.textContent = formatYen(res.inspectionFee);
      }
      if (elJibaiseki25Note) {
        elJibaiseki25Note.textContent = "※参考：25か月契約の場合は " + formatYen(res.jibaiseki25m) + "（エコカー減税対象車は重量税が減税・免税になる場合があります）";
      }

      if (elVariableAmt && elVariableExact) {
        if (res.hasTotalEstimate) {
          elVariableAmt.textContent = res.variableApproxText;
          elVariableExact.textContent = "実数差額（総額目安 − 法定費用）：" + res.variableExactText + "（※依頼先の基本料設定と車両の整備内容で変動）";
        } else {
          elVariableAmt.textContent = "個別見積もりで確認（要出典確認）";
          elVariableExact.textContent = "正本データにこの重量帯の定型総額レンジがないため、法定費用合計（" + formatYen(res.legalFeeTotal) + "）を基準に各事業者の個別見積書でご確認ください。";
        }
      }
    }

    // Read optional URL params (?category=kei&weight=le_1_0t&age=over_18)
    try {
      var searchParams = new URLSearchParams(window.location.search || "");
      var qCat = searchParams.get("category");
      var qWeight = searchParams.get("weight");
      var qAge = searchParams.get("age");
      if (qCat === "kei" || qCat === "ordinary") {
        setRadioValue(categoryInputs, qCat);
      }
      if (qWeight && WEIGHT_TAX_TABLE[qWeight] && qWeight !== "kei_fixed") {
        lastOrdinaryWeight = qWeight;
        if (weightSelect) weightSelect.value = qWeight;
      }
      if (qAge && AGE_LABELS[qAge]) {
        setRadioValue(ageInputs, qAge);
      }
    } catch (e) {
      // Ignore URLSearchParams errors on legacy environments
    }

    for (var i = 0; i < categoryInputs.length; i++) {
      categoryInputs[i].addEventListener("change", render);
    }
    if (weightSelect) {
      weightSelect.addEventListener("change", render);
    }
    for (var j = 0; j < ageInputs.length; j++) {
      ageInputs[j].addEventListener("change", render);
    }
    for (var k = 0; k < presetBtns.length; k++) {
      presetBtns[k].addEventListener("click", function () {
        var c = this.getAttribute("data-cat");
        var w = this.getAttribute("data-weight");
        var a = this.getAttribute("data-age");
        setRadioValue(categoryInputs, c);
        if (c === "ordinary" && w) {
          lastOrdinaryWeight = w;
          syncWeightUI("ordinary");
          if (weightSelect) weightSelect.value = w;
        } else {
          syncWeightUI("kei");
        }
        setRadioValue(ageInputs, a);
        render();
      });
    }

    render();
  }

  var api = {
    WEIGHT_TAX_TABLE: WEIGHT_TAX_TABLE,
    TOTAL_RANGE_TABLE: TOTAL_RANGE_TABLE,
    calculateShakenCost: calculateShakenCost,
    initSimulatorDOM: initSimulatorDOM
  };

  root.ShakenSimulator = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSimulatorDOM);
    } else {
      initSimulatorDOM();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
