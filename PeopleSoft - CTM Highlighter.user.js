// ==UserScript==
// @name         PeopleSoft - CTM Highlighter
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Highlights search results for CTM Suspense Records
// @downloadURL  https://gist.github.com/jamie-r-davis/ff8e4e9850d618d450f25fccb7957a4a/raw/ctm_suspense_highlighter.js
// @updateURL    https://gist.github.com/jamie-r-davis/ff8e4e9850d618d450f25fccb7957a4a/raw/ctm_suspense_highlighter.js
// @author       Jamie Davis
// @match        https://*/*/EMPLOYEE/SA/c/PROCESS_APPLICATIONS.SCC_CONST_STG.GBL
// @match        https://*/*/EMPLOYEE/SA/c/SAD_PDL_DATA_STAGE.SCC_CONST_STG.GBL
// @match        https://*/*/EMPLOYEE/SA/c/SCC_SL_SMP.SCC_CONST_STG.GBL
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    var CTMHighlighter = CTMHighlighter || {
        document: function() { return window.frames['TargetContent'].document || document },
        run: function() {
            this.CompareNames();
            this.CompareFields();
            this.DisableHoverHighlighting();
        },
        EqualTo: function(val1, val2) {
            let cval1 = val1.trim().toLowerCase();
            let cval2 = val2.trim().toLowerCase();
            if (cval1 && cval2) {
                if (cval1 == cval2) {
                    return 1
                }
                return 0
            }
            return -1
        },
        ValueInToken: function(value, tokens, reverse=false) {
            if (value == "" || tokens.length < 1) {
                return -1
            }
            for (let i=1; i<=tokens.length; i++) {
                let tmp_value = null;
                if (reverse) {
                    tmp_value = tokens.slice(-i).join(' ');
                } else {
                    tmp_value = tokens.slice(0, i).join(' ');
                }
                if (CTMHighlighter.EqualTo(value, tmp_value)) {
                    return 1
                }
            }
            return 0
        },
        ApplyValidatedStyles: function(el, valid) {
            let valid_color = 'rgba(106, 236, 24, 0.4)';
            let invalid_color = 'rgba(241, 110, 110, 0.5)';
            let styles = {
                padding: '2px',
                color: '#333',
                background: (valid) ? valid_color : invalid_color
            };
            Object.assign(el.closest('td').style, styles);
        },


        CompareNames: function() {
            function ParseStagedName() {
                let staged_val = CTMHighlighter.document().getElementById('M_CC_CONSTG_WRK_NAME').innerText;
                let lname = staged_val.split(',')[0];
                let tokens = staged_val.split(',')[1].split(' ');
                return {lname: lname, tokens: tokens}
            }
            function CompareLastNames(last_name) {
                CTMHighlighter.document().querySelectorAll('[id^="HTML1$"]').forEach(function(el) {
                    let compare_val = el.innerText;
                    let result = CTMHighlighter.EqualTo(last_name, compare_val);
                    (result > -1) ? CTMHighlighter.ApplyValidatedStyles(el, result) : false;
                });
            }

            function CompareFirstNames(tokens) {
                CTMHighlighter.document().querySelectorAll('[id^="HTML2$"]').forEach(function(el) {
                    let compare_name = el.innerText;
                    let result = CTMHighlighter.ValueInToken(compare_name, tokens);
                    (result > -1) ? CTMHighlighter.ApplyValidatedStyles(el, result) : false;
                });
            }

            function CompareMiddleNames(tokens) {
                CTMHighlighter.document().querySelectorAll('[id^="HTML3$"]').forEach(function(el) {
                    // don't evaluate unless the staged name as 2+ tokens...
                    if (tokens.length < 2) {
                        return false
                    }
                    let compare_name = el.innerText.trim();
                    let result = CTMHighlighter.ValueInToken(compare_name, tokens, true);
                    (result > -1) ? CTMHighlighter.ApplyValidatedStyles(el, result) : false;
                });
            }

            let parsed_name = ParseStagedName();
            CompareLastNames(parsed_name.lname);
            CompareFirstNames(parsed_name.tokens);
            CompareMiddleNames(parsed_name.tokens);
        },
        CompareFields: function() {
            let fields = [
                { // birthdate
                    stg_id: 'SCC_STG_CONSTIT_BIRTHDATE',
                    cmp_id: 'HTML5$'
                },
                { // emplid
                    stg_id: 'M_CC_CON_STG_EMPLID',
                    cmp_id: 'EMPLID$'
                },
                { // sex
                    stg_id: 'SCC_STG_PDE_SEX',
                    cmp_id: 'HTML6$'
                },
                { // email
                    stg_id: 'M_CC_CONSTG_WRK_EMAIL_ADDR',
                    cmp_id: 'HTML9$'
                },
                { // ssn
                    stg_id: 'M_CC_CONSTG_WRK_NATIONAL_ID',
                    cmp_id: 'HTML4$',
                    transform: function(val) { return val.replace(/-/g, '') }
                }
            ];
            // loop through entries in field_map and do the comparisons
            //console.group('CompareFields Loop')
            fields.forEach(function(entry) {
                //console.log(entry);
                let staged_el = CTMHighlighter.document().getElementById(entry.stg_id);
                let staged_val = (staged_el.tagName == "INPUT") ? staged_el.value : staged_el.innerText;
                staged_val = staged_val.trim();
                // apply transform function, if exists
                staged_val = (entry.transform) ? entry.transform(staged_val) : staged_val;


                // find all matching search result fields and apply comparison + styles
                CTMHighlighter.document().querySelectorAll('[id^="'+entry.cmp_id+'"]').forEach(function(el) {
                    let compare_val = el.innerText;
                    let result = CTMHighlighter.EqualTo(staged_val, compare_val);
                    (result > -1) ? CTMHighlighter.ApplyValidatedStyles(el, result) : false;
                });

            });
            // console.groupEnd();
        },
        DisableHoverHighlighting: function() {
            let document = CTMHighlighter.document();
            document.querySelectorAll('[id^="trPERSON$"]').forEach(function(el) {
                el.setAttribute('onmouseover', '');
                el.setAttribute('onmouseout', '');
                el.setAttribute('onclick', '');
            });
        }
    };

    function ObserverCallback () {
        let document = window.frames['TargetContent'].document || document;
        (document.querySelector('[page="M_CC_MATCH_INFO"]')) ? CTMHighlighter.run() : false;
    }

    let observer = new MutationObserver(ObserverCallback);
    let targetNode = window.top.document.documentElement || window.top.document.body;
    observer.observe(targetNode, {attributes: true, childList: true, subtree: true});
})();