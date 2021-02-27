(function($){
    $.fn.smpSortableTable = function (data, max, lang, userSettings) {
        // Default settings
        // I'll use this for any future settings so as to not clutter up the function call
        let settings = {
            responsive:true,
            stateful:true,
            emptyCell:"N/A",
            tr: {
                class:""
            },
            td: {
                class:""
            }
        } ;
        // Merge user settings with the settings object
        if(typeof userSettings === 'object') {
            for (var key in userSettings) {
                if(userSettings.hasOwnProperty(key)) {
                    settings[key] = userSettings[key];
                }
            }
        }

        // Victor Rivas <vrivas@ujaen.es>: 30-jul-2018
        // If lang is not defined, then lang is en
        lang = lang || "en" ;
        lang = lang.toLowerCase() ;
        let local = function(word) {
            let dict = {
                "en": {
                    "of": "Of",
                    "next": "Next",
                    "previous": "Previous",
                    "first": "First",
                    "last": "Last",
                    "nothing": "Nothing to Display",
                    "sort" : "Sort table by:"
                },
                "es": {
                    "of": "De",
                    "next": "Siguiente",
                    "previous": "Anterior",
                    "first": "Primero",
                    "last": "&Uacute;ltimo",
                    "nothing": "Nada que mostrar",
                    "sort" : "Ordenar tabla por:"
                },
                "pt": {
                    "of": "Do",
                    "next": "Pr&oacute;ximo",
                    "previous": "Anterior",
                    "first": "Primeiro",
                    "last": "&Uacute;ltimo",
                    "nothing": "Nada a exibir",
                    "sort" : "Ordenar tabela por:"
                },
                "symbols": {
                    "of": "/",
                    "next": "&#9654;",
                    "previous": "&#9664;",
                    "first": "|&#9664;",
                    "last": "&#9654;|",
                    "nothing": "&#8709;",
                    "sort" : "▼/▲"
                }
            };
            dict["en-us"] = dict["en-uk"] = dict["en"] ;
            dict["es-es"] = dict["es"] ;
            dict["pt-br"] = dict["pt-pt"] = dict["pt"] ;

            // If lang is defined but not included in dict, then lang is en
            lang=( typeof dict[lang] === 'undefined' ) ? "en" : lang ;

            // If the word is not in our little dictionary
            return ( typeof dict[lang][word.toLowerCase()] === 'undefined' ) ? "unknown" : dict[lang][word.toLowerCase()] ;
        } ;

        let changeState = function(state, pop) {
            if (history.pushState) {
                let url = window.location.href,
                    parts = "", query = "", count = 0 ;

                if(pop) { // If called directly after a pop state
                    return ;
                }

                if((parts = url.split('?')).length > 1) {
                    let queryParts = "" ;
                    url   = parts[0] ;
                    query = parts[1].split("&") ;

                    for(let item in query) if(query.hasOwnProperty(item))
                        if((queryParts = query[item].split("=")).length > 1)
                            if(typeof state[queryParts[0]] === "undefined")
                                state[queryParts[0]] = queryParts[1] ;
                }

                for(let name in state) if(state.hasOwnProperty(name))
                    url += (++count === 1 ? "?" : "&") + `${name}=${state[name]}` ;

                window.history.pushState({ path: url }, "", url);
            }
        }

        let getState = function(max, tableName, popped) {
            let parts = "", query = "", resp = {
                start: 0, max: max, end: max, pop: popped,
                sort: "", order: ""
            } ;

            if(!settings.stateful) return resp ;

            if((parts = window.location.href.split('?')).length > 1) {
                let queryParts = "" ;
                query = parts[1].split("&") ;

                for(let item in query) if(query.hasOwnProperty(item))
                    if((queryParts = query[item].split("=")).length > 1)
                        switch(queryParts[0]) {
                            case tableName + "_start":
                                resp.start = isNaN(parseInt(queryParts[1])) ? 0 : parseInt(queryParts[1]) ;
                                break ;
                            case tableName + "_max":
                                resp.max = isNaN(parseInt(queryParts[1])) ? max : parseInt(queryParts[1]) ;
                                break ;
                            case tableName + "_sort":
                                resp.sort = queryParts[1] ;
                                break ;
                            case tableName + "_order":
                                resp.order = queryParts[1].toLowerCase() === "asc" ? "asc" : "desc" ;
                                break ;
                        }
            }

            resp.end = resp.start + resp.max ;
            return resp ;
        }

        // Function which creates data structure if HTML table data used
        let generateData = function($table) {
            let keys = [] ;
            let data = [] ;

            $table.find('thead th').each(function(i,v){
                keys.push($(v).attr('id')) ;
            }) ;

            $table.find('tbody tr').each(function(i,v){
                let $tmp = {} ;
                $.each(keys, function(i,v2){
                    let sort = $($(v).children('td')[i]).data('smp-sort');
                    if(typeof sort === "undefined") $tmp[v2] = $(v).children('td')[i].innerHTML;
                    else $tmp[v2] = { "text": $(v).children('td')[i].innerHTML, "sort": sort } ;
                }) ;
                data.push($tmp) ;
            }) ;

            return data ;
        };

        // Re-render the table data whenever a change is made
        let renderTable = function (start, end, max, data, tableName) {
            let returnHTML = '' ;
            for (let i = start; i < Math.min(end, max); i++) {
                returnHTML += '<tr class="' + settings.tr.class + '">';
                for (let key in data[i]) {
                    if(data[i].hasOwnProperty(key)) {
                        let colText = $('#' + tableName + '_' + key).text() ;
                        if (typeof data[i][key] !== 'object')
                            returnHTML +=
                                '<td data-smp-content="' + colText + '" class="' + settings.td.class + '">' +
                                    (data[i][key] !== '' ? data[i][key] : settings.emptyCell) +
                                '</td>';
                        else returnHTML +=
                                '<td data-smp-content="' + colText + '" class="' + settings.td.class + '">' +
                                    (data[i][key].text !== '' ? data[i][key].text : settings.emptyCell) +
                                '</td>';
                    }
                }
                returnHTML += '</tr>';
            }
            return returnHTML;
        };

        // The functions that will sort the table when a column header is clicked
        let sortFns = function (key) {
            return {
                desc: function (a, b) {
                    if (typeof a[key] !== 'object')
                        return a[key] > b[key] ? -1 :
                            (a[key] < b[key] ? 1  : 0);
                    else return a[key].sort > b[key].sort ? -1 :
                        (a[key].sort < b[key].sort ? 1  : 0);
                },
                asc: function (a, b) {
                    if (typeof a[key] !== 'object')
                        return a[key] < b[key] ? -1 :
                            (a[key] > b[key] ? 1  : 0);
                    else return a[key].sort < b[key].sort ? -1 :
                        (a[key].sort > b[key].sort ? 1  : 0);
                }
            }
        };

        /* SETUP */

        let $table = $(this);
        let tableName = $table.attr('id');
        max = max < 1 ? 10 : (max || 10) ;
        data = !data ? generateData($table) : data ;

        let state = getState(max, tableName, false);

        if( settings.stateful ) {
            window.onpopstate = () => {
                let prevStart = state.start ;
                state = getState(max, tableName, true);
                if(state.start < prevStart)
                    navigate("popLess") ;
                else
                    navigate("popMore") ;
                state.pop = false ;
            } ;
        }

        $table.addClass('smpSortableTable--processed') ;
        // Make table responsive if user does not explicitly disable it
        if(settings.responsive) {
            $table.addClass('responsive') ;
        }
        $table.find('thead').attr('data-smp-content', local("sort")) ;
        $table.find('tbody').html(renderTable(state.start, data.length, state.end, data, tableName));
        $table.find('th:not(.smp-not-sortable)').addClass('smpSortableTable--sortable ' + tableName + '--sortable');
        // Insert navigation buttons
        $table.after(
            '<div class="smpSortableTable--nav" id="' + tableName + '--nav">' +
            '<span class="smpSortableTable--counter" id="' + tableName + '--counter"></span>' +
            '<div class="smpSortableTable--nav-left"><a class="smpSortableTable--nav-links smpSortableTable--first" id="' +
            tableName + '--first">' + local("first") + '</a>' +
            '<a class="smpSortableTable--nav-links smpSortableTable--prev" id="' +
            tableName + '--prev">' + local("previous") + '</a></div>' +
            '<div class="smpSortableTable--nav-right"><a class="smpSortableTable--nav-links smpSortableTable--next" id="' + tableName + '--next">' +
            local("next") + '</a>' +
            '<a class="smpSortableTable--nav-links smpSortableTable--last" id="' + tableName + '--last">' +
            local("last") + '</a>' + '</div></div>'
        );

        $.each($table.find('th'), function (i, v) {
            // Assign tableName_id ids to all th tags
            let id = $(v).attr('id');
            $(v).attr('id', tableName + '_' + id);
            // Set data-smp-content attribute of all cells of this column to th text
            //  for table responsiveness on smaller screens
            $('#' + tableName + ' tbody td:nth-child(' + (i+1) + ')').attr('data-smp-content', $(v).text()) ;
        });

        /* Init counter */
        if (data.length) {
            $('#' + tableName + '--counter').text(
                (state.start + 1) + ' - ' + Math.min(data.length, state.end) + ' ' + local("of").toLowerCase() + ' ' + data.length
            );
        } else {
            $('#' + tableName + '--counter').text(local('nothing'));
            $('#' + tableName + '--next').addClass('smpSortableTable--disabled');
            $('#' + tableName + '--last').addClass('smpSortableTable--disabled');
            $table.find('th').removeClass('smpSortableTable--sortable');
        }
        if (state.end >= data.length) {
            $('#' + tableName + '--next').addClass('smpSortableTable--disabled');
            $('#' + tableName + '--last').addClass('smpSortableTable--disabled');
        }
        if (!state.start) {
            $('#' + tableName + '--prev').addClass('smpSortableTable--disabled');
            $('#' + tableName + '--first').addClass('smpSortableTable--disabled');
        }
        if (data.length <= state.max) {
            $('#' + tableName + '--next').addClass('smpSortableTable--disabled');
            $('#' + tableName + '--last').addClass('smpSortableTable--disabled');
            $('#' + tableName + '--nav').addClass('smpSortableTable--nav-hidden');
        }

        let navigate = (action) => {
            switch(action) {
                case "next":
                    state.start += state.max;
                    break;
                case "last":
                    state.start = Math.trunc(data.length/state.max) * state.max ;
                    state.start -= state.start < data.length ? 0 : state.max ;
                    break;
                case "prev":
                    state.start -= state.max;
                    break;
                case "first":
                    state.start = 0 ;
                    break;
            }

            state.end = state.start + state.max ;

            $table.find('tbody').html(
                renderTable(state.start, data.length, state.end, data, tableName)
            ) ;

            $('#' + tableName + '--counter').text(
                (state.start + 1) + ' - ' + Math.min(data.length, state.end) + ' '+local("of").toLowerCase()+' ' + data.length
            );

            if( settings.stateful ) {
                let newState = {} ;
                newState[tableName + "_start"] = state.start;
                changeState(newState, state.pop);
            }

            if(action === "next" || action === "last" || action === "popMore") {
                $('#' + tableName + '--prev').removeClass('smpSortableTable--disabled');
                $('#' + tableName + '--first').removeClass('smpSortableTable--disabled');
                if (state.end >= data.length) {
                    $('#' + tableName + '--next').addClass('smpSortableTable--disabled');
                    $('#' + tableName + '--last').addClass('smpSortableTable--disabled');
                }
            } else if(action === "prev" || action === "first" || action === "popLess") {
                $('#' + tableName + '--next').removeClass('smpSortableTable--disabled');
                $('#' + tableName + '--last').removeClass('smpSortableTable--disabled');
                if (!state.start) {
                    $('#' + tableName + '--prev').addClass('smpSortableTable--disabled');
                    $('#' + tableName + '--first').addClass('smpSortableTable--disabled');
                }
            }
        } ;

        /* Init next/prev */
        if (data.length > state.max) {
            $('#' + tableName + '--next').click(function () {
                if (!$(this).hasClass('smpSortableTable--disabled')) {
                    navigate("next") ;
                }
            });
            $('#' + tableName + '--last').click(function () {
                if (!$(this).hasClass('smpSortableTable--disabled')) {
                    navigate("last") ;
                }
            });
            $('#' + tableName + '--prev').click(function () {
                if (!$(this).hasClass('smpSortableTable--disabled')) {
                    navigate("prev") ;
                }
            });
            $('#' + tableName + '--first').click(function () {
                if (!$(this).hasClass('smpSortableTable--disabled')) {
                    navigate("first") ;
                }
            });
        }

        /* Init sorting*/
        $('.' + tableName + '--sortable').click(function () {
            let direction = $(this).hasClass('asc') ? 'desc' : 'asc';
            let colName = $(this).attr('id').replace(tableName + '_', '');
            $('.' + tableName + '--sortable').removeClass('desc asc');
            data.sort(sortFns(colName)[direction]);
            $table.find('tbody').html(
                renderTable(state.start, data.length, state.end, data, tableName)
            );
            if( settings.stateful ) {
                let newState = {} ;
                newState[tableName + "_sort"]  = colName;
                newState[tableName + "_order"] = direction;
                changeState(newState, state.pop);
            }
            $(this).addClass(direction);
        });

        if(state.sort !== "") {
            $('#' + tableName + '_' + state.sort).addClass(state.order === 'asc' ? 'desc' : 'asc').trigger("click") ;
        }
    };
})(jQuery) ;
