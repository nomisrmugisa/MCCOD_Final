import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../Context";
import { observer } from "mobx-react";
import Highcharts, { Options } from "highcharts";
import englishString from "./../assets/english.json";
import frenchString from "./../assets/french.json";
import { Input, Select } from "antd";

const { Search } = Input;

const allLanguages = [
   {
      langName: "English",
      lang: englishString,
   },
   {
      langName: "French",
      lang: frenchString,
   },
];

const arrowDown =
   '<svg class="ptarrow" fill="green" viewBox="0 0 1024 1024"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"/>';
const arrowUp =
   '<svg class="ptarrow" fill="red" viewBox="0 0 256 256"><path d="M215.39111,163.06152A8.00015,8.00015,0,0,1,208,168H48a7.99981,7.99981,0,0,1-5.65674-13.65674l80-80a8,8,0,0,1,11.31348,0l80,80A7.99982,7.99982,0,0,1,215.39111,163.06152Z"/></svg>';
const dash =
   '<svg class="ptarrow" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 8a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z" fill="#2f7ed8"/></svg>';

Highcharts.AST.allowedTags.push("svg");
Highcharts.AST.allowedAttributes.push("viewBox");

export const WeeklyReport = observer(() => {
   const store = useStore();
   let chart: any = useRef(null);
   const [chartTitle, setChartTitle] = useState("Mortality Indicators");
   const [currChartType, setCurrChartType] = useState("column");
   const currDiseases = useRef([]);

   const [activeLanguage, setActiveLanguage] = useState(store.activeLanguage || allLanguages[0]);

   const groupDeathsToOrgUnits = (deaths) => {
      let deathOrgs = {};
      const level = Number(store.getCurrentOrgUnitLevel()) + 1;

      deaths.forEach((death) => {
         let orgUnit;
         if (level == 5) orgUnit = death.orgUnit;
         else orgUnit = store.getOrgUnitLevels(death.orgUnit).find((l) => l.level == level)?.id;
         if (!!orgUnit) {
            if (!deathOrgs[orgUnit]) {
               deathOrgs[orgUnit] = [];
            }
            const indi1 = store.allIndis[orgUnit]?.["vyOajQA5xTu"] ?? 0;
            const indi2 = store.allIndis[orgUnit]?.["T8W0wbzErSF"] ?? 0;
            deathOrgs[orgUnit].push({
               ...death,
               indi1,
               indi2,
            });
         }
      });

      return Object.keys(deathOrgs).map((orgUnit) => {
         return {
            name: store.getOrgUnitName(orgUnit),
            orgUnit,
            deaths: deathOrgs[orgUnit],
            count: deathOrgs[orgUnit].length,
            approved: deathOrgs[orgUnit].filter((d) => d["twVlVWM3ffz"] != "Not Approved").length,
         };
      });
   };

   const colOptions: any = {
      chart: {
         type: "column",
      },
      title: {
         text: chartTitle,
      },
      xAxis: [
         {
            categories: [],
            crosshair: true,
         } as any,
      ],
      yAxis: {
         min: 0,
         title: {
            text: "Death count",
         },
      },
      series: [
         { name: "Deaths", color: "red" } as any,
         { name: "Approved Deaths", color: "blue" } as any,
         { name: "108-CI03. No. of deaths", color: "green" } as any,
         { name: "105-MA04c1. Deliveries in unit - Fresh still birth", color: "orange" } as any,
      ],
      tooltip: {
         useHTML: true,
         pointFormatter: function () {
            let point: any = this;
            let arrow = "";

            const disease = currDiseases.current[point.x];

            arrow = disease.count > disease.prev ? arrowUp : disease.count == disease.prev ? dash : arrowDown;

            return `<div class="ptlabel">${point.series?.name}: <b>${point.y}</b>${arrow}</div>`;
         },
      },
      credits: {
         enabled: false,
      },
   };

   let pieOptions = {
      chart: {
         plotBackgroundColor: null,
         plotBorderWidth: null,
         plotShadow: false,
         type: "pie",
      } as any,
      title: {
         text: chartTitle,
      },
      tooltip: {
         useHTML: true,
         pointFormatter: function () {
            let point: any = this;
            let arrow = "";

            const disease = currDiseases.current[point.x];
            arrow = disease.count > disease.prev ? arrowUp : disease.count == disease.prev ? dash : arrowDown;
            return `<div class="ptlabel">${point.series.name}: <b>${parseFloat(point.percentage).toFixed(
               1
            )}%</b>${arrow}</div>`;
         },
      },
      plotOptions: {
         pie: {
            allowPointSelect: true,
            cursor: "pointer",
            dataLabels: {
               enabled: true,
               useHTML: true,
               formatter: function () {
                  const pointd: any = this;
                  const point = pointd.point;

                  let arrow = "";

                  const disease = currDiseases.current[point.x];
                  if (!!disease)
                     arrow = disease.count > disease.prev ? arrowUp : disease.count == disease.prev ? dash : arrowDown;

                  return `<div class="ptlabel"><b>${point.name}</b>: ${parseFloat(point.percentage).toFixed(
                     1
                  )}:% ${arrow}</div>`;
               },
            },
         },
      },
      series: [
         {
            name: "Deaths",
            colorByPoint: true,
            data: [{}],
         } as any,
      ],
      credits: {
         enabled: false,
      },
   };

   const changeChartType = (chartType: string) => {
      let opts = null;
      setCurrChartType(chartType);
      if (chartType == "pie") {
         opts = pieOptions;
         if (!!currDiseases.current)
            opts.series[0].data = currDiseases.current.map((d: any) => {
               return {
                  name: d.name,
                  y: d.count,
               };
            });
      } else if (chartType == "column") {
         opts = colOptions ?? {};
         if (!!currDiseases.current && opts !== undefined) {
            opts.xAxis[0].categories = currDiseases.current?.map((d: any) => d?.name);
            opts.series[0].data = currDiseases.current?.map((d: any) => {
               return {
                  y: d.count,
                  color: "red",
               };
            });
            opts.series[1].data = currDiseases.current?.map((d: any) => {
               return {
                  y: d.approved,
                  color: "blue",
               };
            });
            opts.series[2].data = currDiseases.current?.map((d: any) => {
               return {
                  y: d.indi1,
                  color: "green",
               };
            });
            opts.series[3].data = currDiseases.current?.map((d: any) => {
               return {
                  y: d.indi2,
                  color: "orange",
               };
            });
         }
      }

      if (!!chart.current && !!opts) {
         chart.current.destroy();
         chart.current = Highcharts.chart("topdiseases", opts);
      }
   };

   useEffect(() => {
      console.log("EventList:hook nationalitySelect", store.selectedNationality);

      const opts = currChartType == "column" ? colOptions : pieOptions;
      chart.current = Highcharts.chart("topdiseasesm", opts);
      console.log("currChartx", chart.current);

      store.queryTopEvents().then(() => {
         console.log("allDeaths", store.allDeaths);
         if (!!store.allDeaths && !!store.allDeaths.length) {
            let sortedDiseases = [];

            if (
               (!store.currentOrganisation && !!store.selectedCauseOfDeath && !!store.selectedOrgUnit) ||
               !!store.selectedLevel
            ) {
               sortedDiseases = groupDeathsToOrgUnits(store.allDeaths);
            } else if (!store.currentOrganisation && !!store.selectedOrgUnit && !store.selectedCauseOfDeath) {
               sortedDiseases = []; //groupDiseaseToFilters(store.allDiseases);
            }
            sortedDiseases = groupDeathsToOrgUnits(store.allDeaths);

            console.log("sortedDiseases", sortedDiseases);

            currDiseases.current = sortedDiseases;
            if (currChartType == "column") {
               chart.current.xAxis[0].setCategories(sortedDiseases.map((d: any) => d.name)); //setting category
            }
            chart.current.series[0].setData(
               sortedDiseases.map((d: any) => {
                  if (currChartType == "column")
                     return {
                        y: d.count,
                        color: "red",
                     };
                  else
                     return {
                        name: d.name,
                        y: d.count,
                     };
               }),
               true
            ); //setting data
            chart.current.series[1].setData(
               sortedDiseases.map((d: any) => {
                  if (currChartType == "column")
                     return {
                        y: d.approved,
                        color: "blue",
                     };
                  else
                     return {
                        name: d.name,
                        y: d.approved,
                     };
               }),
               true
            ); //setting data

            chart.current.series[2].setData(
               sortedDiseases.map((d: any) => {
                  if (currChartType == "column")
                     return {
                        y: d.indi1,
                        color: "green",
                     };
                  else
                     return {
                        name: d.name,
                        y: d.indi1,
                     };
               }),
               true
            ); //setting data

            chart.current.series[3].setData(
               sortedDiseases.map((d: any) => {
                  if (currChartType == "column")
                     return {
                        y: d.indi2,
                        color: "orange",
                     };
                  else
                     return {
                        name: d.name,
                        y: d.indi2,
                     };
               }),
               true
            ); //setting data
         }
         chart.current.hideLoading();
      });

      store.queryEvents().then(() => {});
   }, [
      store?.selectedNationality,
      store?.nationalitySelect,
      store.selectedCauseOfDeath,
      store?.selectedLevel,
      store.selectedOrgUnit,
   ]);

   return (
      <div id="topdiseaseswrapper">
         <div
            id="topdiseasesm"
            style={{
               width: "100%",
               height: "400px",
               marginBottom: "20px",
            }}
         ></div>

         <div
            className="chartOpts"
            style={{
               left: 0,
            }}
         >
            <div
               style={{
                  marginRight: "auto",
                  paddingLeft: "1rem",
               }}
            ></div>

            <div className="chartPicker">
               <button
                  type="button"
                  className="chart-pick-item"
                  onClick={() => {
                     changeChartType("column");
                  }}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                     <g fill="none" fillRule="evenodd">
                        <polygon points="0 0 48 0 48 48 0 48"></polygon>
                        <polygon fill="#147CD7" points="12 12 18 12 18 36 12 36"></polygon>
                        <polygon fill="#147CD7" points="22 22 28 22 28 36 22 36"></polygon>
                        <polygon fill="#147CD7" points="32 7 38 7 38 36 32 36"></polygon>
                        <polygon fill="#4A5768" points="6 6 8 6 8 42 6 42"></polygon>
                        <polygon fill="#4A5768" points="6 40 42 40 42 42 6 42"></polygon>
                     </g>
                  </svg>
               </button>
               <button
                  type="button"
                  className="chart-pick-item"
                  onClick={() => {
                     changeChartType("pie");
                  }}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,48,48">
                     <g fill="none" fillRule="evenodd" transform="rotate(90 24 24)">
                        <polygon points="0 0 48 0 48 48 0 48"></polygon>
                        <circle cx="24" cy="24" r="16" stroke="#4A5768" strokeWidth="2"></circle>
                        <path
                           fill="#FFC324"
                           d="M11,24 C11,31.1797017 16.8202983,37 24,37 C31.1797017,37 37,31.1797017 37,24 C37,16.8202983 31.1797017,11 24,11 L24,24 L11,24 Z"
                           transform="rotate(165 24 24)"
                        ></path>
                        <path
                           fill="#147CD7"
                           d="M11,24 C11,31.1797017 16.8202983,37 24,37 C31.1797017,37 37,31.1797017 37,24 C37,16.8202983 31.1797017,11 24,11 L24,24 L11,24 Z"
                           transform="rotate(-15 24 24)"
                        ></path>
                     </g>
                  </svg>
               </button>
            </div>

            {/*
					<div className="chart-date-range">
          			</div>
					*/}
         </div>
      </div>
   );
});