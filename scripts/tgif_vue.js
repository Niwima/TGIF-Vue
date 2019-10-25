const vueApp = new Vue({
    el: "#vue_app",
    data: {
        chamberName: "",
        congressNumber: "",
        chamberMembers: [],
        demParty: {
            name: 'Democrats',
            members: [],
            numOfMembers: 0,
            partyLoyalty: 0,
        },
        repParty: {
            name: 'Republicans',
            members: [],
            numOfMembers: 0,
            partyLoyalty: 0,
        },
        indParty: {
            name: 'Independents',
            members: [],
            numOfMembers: 0,
            partyLoyalty: 0,

        },
        totalMembers: 0,
        bestAttendance: 0,
        worstAttendance: 0,
        mostLoyal: 0,
        leastLoyal: 0,
        averageLoyalty: 0,
        stateList: [],
        congressYears: "",
    },
    methods: {
        //master function that makes AJAX call based on the location and then calls fillData 
        setupPage: function () {
            this.hideTables();
            this.reviveSpinner();
            let congress = 113;
            if (sessionStorage.getItem('congressInput') === null) {
                congress = 113;
            } else {
                congress = sessionStorage.getItem('congressInput');
            }
            this.congressYears = (1787 + (congress*2))+" to "+(1788 + (congress*2));
            this.congressNumber = this.addOrdinalSuffix(congress);
            let senateUrl = "https://api.propublica.org/congress/v1/" + congress + "/senate/members.json";
            let houseUrl = "https://api.propublica.org/congress/v1/" + congress + "/house/members.json";
            let houseData;
            let senateData;
            if (window.location.href.includes('house')) {
                fetch(houseUrl, {
                        method: "GET",
                        headers: {
                            'X-API-Key': 'ukjsKe0KE7iXvEjs6uYET9kd2ElifQ11XLOSxXaY'
                        }
                    })
                    .then(function (response) {
                        if (response.ok) {
                            houseData = response.json();
                            return houseData;
                        }
                    })
                    .then(function (houseData) {
                        vueApp.fillData(houseData);
                        vueApp.killSpinner();
                        vueApp.revealTables();
                    })
            } else
            if (window.location.href.includes('senate')) {
                fetch(senateUrl, {
                        method: "GET",
                        headers: {
                            'X-API-Key': 'ukjsKe0KE7iXvEjs6uYET9kd2ElifQ11XLOSxXaY'
                        }
                    })
                    .then(function (response) {
                        if (response.ok) {
                            senateData = response.json();
                            return senateData;
                        }
                    })
                    .then(function (senateData) {
                        vueApp.fillData(senateData);
                        vueApp.killSpinner();
                        vueApp.revealTables();
                    })
            }
        },
        //function called by setupPage which uses other funtions to fill all of the attributes in the data object
        fillData: function (chamberData) {
            vueApp.chamberName = chamberData.results[0].chamber;
            if (vueApp.chamberName === "House") {
                vueApp.chamberName = "House of Representatives";
            }
            vueApp.chamberMembers = chamberData.results[0].members;
            vueApp.giveFullNames(vueApp.chamberMembers);
            vueApp.givePartyVotes(vueApp.chamberMembers);
            vueApp.givePartyClass(vueApp.chamberMembers);
            vueApp.totalMembers = vueApp.chamberMembers.length;
            vueApp.fillParties()
            vueApp.averageLoyalty = vueApp.calculateLoyalty(vueApp.chamberMembers);
            vueApp.bestAttendance = vueApp.findBot10Pct(vueApp.chamberMembers, 'missed_votes_pct');
            vueApp.worstAttendance = vueApp.findTop10Pct(vueApp.chamberMembers, 'missed_votes_pct');
            vueApp.leastLoyal = vueApp.findBot10Pct(vueApp.chamberMembers, 'votes_with_party_pct');
            vueApp.mostLoyal = vueApp.findTop10Pct(vueApp.chamberMembers, 'votes_with_party_pct');
            vueApp.stateList = vueApp.makeStateList();
        },
        // subfunction that makes an alphabetical list of all of the abbreviated states for use in making the options for a select element
        makeStateList: function () {
            let states = [];
            for (let i = 0; i < vueApp.chamberMembers.length; i++)
                if (states.includes(vueApp.chamberMembers[i].state) === false) {
                    states.push(vueApp.chamberMembers[i].state);
                }
            states.sort();
            return states
        },
        //subfunction which adds the proper ordinal suffix to congressnumber
        addOrdinalSuffix: function (num) {
            num += "";
            let numEnd = "";
            if (num.length == 1) {
                numEnd += num[num.length - 1];
            } else {
                numEnd += num[num.length - 2] + num[num.length - 1];
            }
            if ((numEnd == "1") || (numEnd == "21") || (numEnd == "31") || (numEnd == "41") || (numEnd == "51") || (numEnd == "61") || (numEnd == "71") || (numEnd == "81") || (numEnd == "91") || (numEnd == "01")) {
                num += "st";
            } else if ((numEnd == "2") || (numEnd == "22") || (numEnd == "32") || (numEnd == "42") || (numEnd == "52") || (numEnd == "62") || (numEnd == "72") || (numEnd == "82") || (numEnd == "92") || (numEnd == "02")) {
                num += "nd";
            } else if ((numEnd == "3") || (numEnd == "23") || (numEnd == "33") || (numEnd == "43") || (numEnd == "53") || (numEnd == "63") || (numEnd == "73") || (numEnd == "83") || (numEnd == "93") || (numEnd == "03")) {
                num += "rd";
            } else num += "th";
            return num;
        },
        //subfunction to combine first, middle, and last names, skipping the middle name if it is 'null.'
        giveFullNames: function (chamberMembers) {
            for (let i = 0; i < chamberMembers.length; i++) {
                if (chamberMembers[i].middle_name === null) {
                    chamberMembers[i].full_name = chamberMembers[i].first_name + " " +
                        chamberMembers[i].last_name; //for members with no middle name
                } else {
                    chamberMembers[i].full_name = chamberMembers[i].first_name + " " + chamberMembers[i].middle_name + " " +
                        chamberMembers[i].last_name; //for members with a middle name
                }
            }
        },
        givePartyVotes: function (chamberMembers) {
            for (let i = 0; i < chamberMembers.length; i++) {
                chamberMembers[i].party_votes = Math.round(vueApp.chamberMembers[i].total_votes * vueApp.chamberMembers[i].votes_with_party_pct / 100) || 0;
            }
        },
        givePartyClass: function (chamberMembers) {
            for (let i = 0; i < chamberMembers.length; i++) {
                chamberMembers[i].party_class = "party" + chamberMembers[i].party;
            }
        },
        //subfunction that fills all of the attributes within the parties
        fillParties: function () {
            vueApp.demParty.members = []
            vueApp.repParty.members = []
            vueApp.indParty.members = []
            vueApp.chamberMembers.forEach(function (member) { // fill party members arrays
                if (member.party == "D") {
                    vueApp.demParty.members.push(member);
                } else if (member.party == "R") {
                    vueApp.repParty.members.push(member);
                } else if (member.party == "I") {
                    vueApp.indParty.members.push(member);
                }
            })
            vueApp.demParty.numOfMembers = vueApp.demParty.members.length;
            vueApp.repParty.numOfMembers = vueApp.repParty.members.length;
            vueApp.indParty.numOfMembers = vueApp.indParty.members.length;
            //party loyalties
            vueApp.demParty.partyLoyalty = vueApp.calculateLoyalty(vueApp.demParty.members);
            vueApp.repParty.partyLoyalty = vueApp.calculateLoyalty(vueApp.repParty.members);
            vueApp.indParty.partyLoyalty = vueApp.calculateLoyalty(vueApp.indParty.members);
        },
        //subfunction that is called by fillParties and fillData to calculate average overall loyalty and party loyalty
        calculateLoyalty: function (membersList) {
            let average = 0;
            for (let i = 0; i < membersList.length; i++) {

                membersList[i].votes_with_party_pct = membersList[i].votes_with_party_pct || 0

                average += membersList[i].votes_with_party_pct;
            }
            average /= membersList.length;
            return Math.round(average || 0)
        },
        //subfunction that finds the top 10% of chamberMembers (including all ties) based on any given statistic 
        //that is input as a string, used both for loyalty and attendance
        findTop10Pct: function (chamberMembers, statistic) {
            let statList = [];
            for (let i = 0; i < chamberMembers.length; i++) {
                statList.push(chamberMembers[i][statistic]);
            }
            statList.sort(function (a, b) {
                return a - b
            });
            let lowestTop = statList[statList.length - Math.round(statList.length / 10)]; //bottom of the top 10%
            let top10Pct = [];
            top10Pct = chamberMembers.filter(function (member) {
                return member[statistic] >= lowestTop
            });
            top10Pct.sort((a, b) => (a[statistic] < b[statistic]) ? 1 : -1);
            return top10Pct;
        },
        //subfunction that finds the bottom 10% of chamberMembers (including all ties) based on any given statistic 
        //that is input as a string, used both for loyalty and attendance
        findBot10Pct: function (chamberMembers, statistic) {
            let statList = [];
            for (let i = 0; i < chamberMembers.length; i++) {
                statList.push(chamberMembers[i][statistic]);
            }
            statList.sort(function (a, b) {
                return a - b
            });
            let highestBot = statList[Math.round(statList.length / 10) - 1]; //top of the bottom 10%
            let bottom10Pct = [];
            bottom10Pct = chamberMembers.filter(function (member) {
                return member[statistic] <= highestBot
            });
            bottom10Pct.sort((a, b) => (a[statistic] > b[statistic]) ? 1 : -1);
            return bottom10Pct;
        },
        killSpinner: function () {
            if (window.location.href.includes('home') === false) {
                document.getElementById("spinner").style.display = "none";
                document.getElementById("spinner-container").classList.remove("d-flex");
                document.getElementById("spinner-container").style.display = "none";
            }
        },
        reviveSpinner: function () {
            if (window.location.href.includes('home') === false) {
                document.getElementById("spinner").style.display = "block";
                document.getElementById("spinner-container").classList.add("d-flex");
                document.getElementById("spinner-container").style.display = "block";
            }
        },
        //tableFilters master function
        tableFilters: function (tableID) {
            let table = document.getElementById(tableID);
            let tRows = table.getElementsByTagName('tr');
            let demCheckbox = document.getElementById('democrat-checkbox');
            let repCheckbox = document.getElementById('republican-checkbox');
            let indCheckbox = document.getElementById('independent-checkbox');
            let checkboxes = [demCheckbox, repCheckbox, indCheckbox];
            let dropdown = document.getElementById('state-select');
            let selectedParties = ["D", "R", "I"];
            let selectedStates = ['All'];
            vueApp.filterByPartyAndState(tRows, selectedParties, selectedStates);
            checkboxes.forEach(function (checkbox) {
                checkbox.checked = false;
                checkbox.addEventListener("change", function () {
                    selectedParties = [];
                    if (demCheckbox.checked) {
                        selectedParties.push("D");
                    }
                    if (repCheckbox.checked) {
                        selectedParties.push("R");
                    }
                    if (indCheckbox.checked) {
                        selectedParties.push("I", "ID");
                    } else if (demCheckbox.checked === false && repCheckbox.checked === false && indCheckbox.checked === false) {
                        selectedParties.push("D", "R", "I", "ID");
                    }
                    vueApp.filterByPartyAndState(tRows, selectedParties, selectedStates);
                })
            })
            dropdown.addEventListener("change", function () {
                selectedStates = [];
                selectedStates.push(dropdown.options[dropdown.selectedIndex].value);
                vueApp.filterByPartyAndState(tRows, selectedParties, selectedStates);
            });
        },
        //filterByPartyAndState subfunction
        filterByPartyAndState: function (tableRows, parties, states) {
            let rowParty;
            let rowState;
            for (let i = 1; i < tableRows.length; i++) {
                rowParty = tableRows[i].getElementsByTagName("td")[1].getAttribute('value');
                rowState = tableRows[i].getElementsByTagName("td")[2].getAttribute('value');
                if ((states.includes(rowState) || states.includes('All')) && parties.includes(rowParty)) {
                    tableRows[i].style.display = "";
                } else {
                    tableRows[i].style.display = "none";
                }
            }
        },
        // function to hide tables while loading new data
        hideTables: function () {
            let tables = [];
            tables = document.getElementsByClassName('table');
            for (let i = 0; i < tables.length; i++) {
                tables[i].style.display = "none";
            }
            if (window.location.href.includes('attendance') || window.location.href.includes('loyalty')) {
                let tableToggle = document.getElementById("table-toggle-ul");
                tableToggle.style.display = "none";
            }
        },
        // function to make tables visible after spinner has been killed
        revealTables: function () {
            let tables = [];
            tables = (document.getElementsByClassName('table'));
            for (let i = 0; i < tables.length; i++) {
                tables[i].style.display = "table";
            }
            if (window.location.href.includes('attendance') || window.location.href.includes('loyalty')) {
                let tableToggle = document.getElementById("table-toggle-ul");
                tableToggle.style.display = "";
            }
        },
        //button for changing ajax call to another congress number
        changeCongress: function () {
            let congressInput
            let congressInputButton = document.getElementById('congress-input-button')
            congressInputButton.addEventListener('click', function () {
                congressInput = document.getElementById('congress-input').value;
                if (congressInput > 116 || congressInput < 102) {
                    alert("There is not enough data available for that congress. Please pick a congress between the 102nd and the 116th.")
                } else {
                    sessionStorage.setItem("congressInput", congressInput);
                    vueApp.setupPage();
                }
            })
        },
        sideBySideTableToggle: function () {
            let frontTable = document.getElementById("front-table");
            let backTable = document.getElementById("back-table");
            let tableTab1 = document.getElementById("table-tab-1");
            let tableTab2 = document.getElementById("table-tab-2");
            tableTab1.addEventListener("click", function () {
                frontTable.classList.remove("d-md-none");
                frontTable.classList.remove("d-sm-none");
                frontTable.classList.remove("d-none");

                backTable.classList.add("d-md-none");
                backTable.classList.add("d-sm-none");
                backTable.classList.add("d-none");

                tableTab1.classList.add("active");
                tableTab2.classList.remove("active");
            })
            tableTab2.addEventListener('click', function () {
                frontTable.classList.add("d-md-none");
                frontTable.classList.add("d-sm-none");
                frontTable.classList.add("d-none");

                backTable.classList.remove("d-md-none");
                backTable.classList.remove("d-sm-none");
                backTable.classList.remove("d-none");

                tableTab1.classList.remove("active");
                tableTab2.classList.add("active");
            })
        },
    },
    //before creation, hide tables so that the spinner and table don't coexist
    beforeCreate() {
        let tables = [];
        tables = document.getElementsByClassName('table');
        for (let i = 0; i < tables.length; i++) {
            tables[i].style.display = "none";
        }
        if (window.location.href.includes('attendance') || window.location.href.includes('loyalty')) {
            let tableToggle = document.getElementById("table-toggle-ul");
            tableToggle.style.display = "none";
        }
    },
    //fetch and populate data
    created() {
        this.setupPage();

    },
    mounted() {
        if (window.location.href.includes('home') === false) {
            this.changeCongress();
        }
    },
    //once all data is fetched and populated and set up table filters
    updated() {

        if (window.location.href.includes('senate_data')) {
            this.tableFilters('chamber-data-senate');
        } else
        if (window.location.href.includes('house_data')) {
            this.tableFilters('chamber-data-house');
        } else if (window.location.href.includes('home') === false) {
            this.sideBySideTableToggle();
        }
    },
})