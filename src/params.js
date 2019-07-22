const gaTracking = 'UA-119127212-1';
// const hostname = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}/` : 'http://localhost/';
const components = {
  appName:"NDEF",
  index:{
    introduction:{
      heading:"Cross-Commons Datasets",
      text:"Divisions within NIAID can have their own independent data models while maintaining interoperability of the data ecosystem. The data within projects are findable, accessible, interoperable, and reusable (FAIR), but it will be easier for each individual research community to work within the system. Of course, with this approach, two different research communities may create data models that have data elements that may conflict and that will need to be manually de-conflicted.",
      link:"/datasets"
    },
    buttons:[
      {
        name:"ImmPort",
        body:"ImmPort is funded by the NIH, NIAID, and DAIT in support of the NIH mission to share data with the public. Data is provided by NIH-funded programs and other research organizations.",
        external_link:"https://www.immport.org/home",
        logo:"custom/logo/immport-main-icon.png"
      },
      {
        name:"NDC: TB Data Commons",
        icon:"data-explore",
        body:"The TB Project data commons.",
        external_link:"https://tb.niaiddata.org",
        internal_link:"/datasets",
        label:"Explore cohorts"
      },
      {
        name:"NDC: DAIDs Data Commons",
        icon:"data-explore",
        body:"The HIV Data Commons.",
        external_link:"https://daids.niaiddata.org",
        internal_link:"/datasets",
        label:"Explore cohorts"
      }
    ]
  },
  navigation:{
    items:[
      {
        icon:"query",
        link:"/datasets",
        color:"#a2a2a2",
        name:"Dataset Browser"
      },
      {
        icon:"exploration",
        link:"/explorer",
        color:"#a2a2a2",
        name:"Data Explorer"
      }
    ]
  },
  topBar:{
    items:[
      {
        link:"https://gen3.org/resources/user/",
        name:"Documentation"
      }
    ]
  },
  login:{
    title:"NDEF Data Ecosystem",
    subTitle:"Cross-Commons Datasets",
    text:"The website combines government datasets from multiple divisions of NIAID to create clean, easy to navigate visualizations for data-driven discovery within Allergy and Infectious Diseases.",
    contact:"If you have any questions about access or the registration process, please contact ",
    email:"support@datacommons.io"
  },
  footerLogos:[
    {
      src:"/src/img/gen3.png",
      href:"https://ctds.uchicago.edu/gen3",
      alt:"Gen3 Data Commons"
    },
    {
      src:"/src/img/createdby.png",
      href:"https://ctds.uchicago.edu/",
      alt:"Center for Translational Data Science at the University of Chicago"
    },
    {
      src:"/custom/logo/niaid.png",
      href:"https://niaid.bionimbus.org",
      alt:"NIAID Data Hub"
    }
  ],
  charts:{
    boardPluralNames:[
      "Subjects",
      "Studies",
      "Lab records",
      "Files"
    ],
    chartNames:[
      "Subject",
      "Study"
    ],
    indexChartNames:[
      "Subjects",
      "Studies",
      "Lab records",
      "Files"
    ],
    detailPluralNames:[
      "Subjects",
      "Studies",
      "Lab records",
      "Files"
    ]
  }
};
const config = {
  "gaTrackingId": "UA-119127212-1",
  "graphql": {
    "boardCounts": [
      {
        "graphql": "_subject_count",
        "name": "Subject",
        "plural": "Subjects"
      },
      {
        "graphql": "_study_count",
        "name": "Study",
        "plural": "Studies"
      },
      {
        "graphql": "_summary_lab_result_count",
        "name": "Lab record",
        "plural": "Lab records"
      }
    ],
    "chartCounts": [
      {
        "graphql": "_subject_count",
        "name": "Subject"
      },
      {
        "graphql": "_study_count",
        "name": "Study"
      }
    ],
    "projectDetails": "boardCounts"
  },
  "requiredCerts": {},
  "featureFlags": {
    "explorer": true,
    "analysis": true
  },
  "analysisTools": {
    "0": "ndhHIV"
  },
  "dataExplorerConfig": {
    "charts": {
      "project_id": {
        "chartType": "count",
        "title": "Projects"
      },
      "subject_id": {
        "chartType": "count",
        "title": "Subjects"
      },
      "gender": {
        "chartType": "pie",
        "title": "Gender"
      },
      "race": {
        "chartType": "bar",
        "title": "Race"
      },
      "ethnicity": {
        "chartType": "bar",
        "title": "Ethnicity"
      }
    },
    "filters": {
      "tabs": [
        {
          "title": "Subject",
          "fields": [
            "project_id",
            "gender",
            "race",
            "ethnicity",
            "vital_status",
            "frstdthd",
            "species",
            "data_type",
            "data_format"
          ]
        },
        {
          "title": "Diagnosis",
          "fields": [
            "arthxbase",
            "bshbvstat",
            "bshcvstat",
            "cd4nadir",
            "status",
            "virus_type",
            "virus_subtype",
            "hiv_status"
          ]
        },
        {
          "title": "Drug Resistance",
          "fields": [
            "amikacin_res_phenotype",
            "capreomycin_res_phenotype",
            "isoniazid_res_phenotype",
            "kanamycin_res_phenotype",
            "ofloxacin_res_phenotype",
            "pyrazinamide_res_phenotype",
            "rifampicin_res_phenotype",
            "rifampin_res_phenotype",
            "streptomycin_res_phenotype"
          ]
        }
      ]
    },
    "table": {
      "enabled": false,
      "fields": [
        "project_id",
        "race",
        "ethnicity",
        "gender",
        "vital_status",
        "frstdthd",
        "arthxbase",
        "bshbvstat",
        "bshcvstat",
        "cd4nadir",
        "status",
        "virus_type",
        "virus_subtype",
        "_min_viral_load",
        "hiv_status"
      ]
    },
    "dropdowns": {
      "download": {
        "title": "Download"
      }
    },
    "buttons": [
      {
        "enabled": true,
        "type": "data",
        "title": "Download All Clinical",
        "leftIcon": "user",
        "rightIcon": "download",
        "fileName": "clinical.json",
        "dropdownId": "download"
      },
      {
        "enabled": true,
        "type": "manifest",
        "title": "Download Manifest",
        "leftIcon": "datafile",
        "rightIcon": "download",
        "fileName": "manifest.json",
        "dropdownId": "download"
      },
      {
        "enabled": true,
        "type": "export-to-workspace",
        "title": "Export To Workspace",
        "leftIcon": "datafile",
        "rightIcon": "download"
      }
    ],
    "arrangerConfig": {
      "projectId": "search",
      "graphqlField": "subject",
      "index": "",
      "manifestMapping": {
        "resourceIndexType": "file",
        "resourceIdField": "object_id",
        "referenceIdFieldInResourceIndex": "subject_id",
        "referenceIdFieldInDataIndex": "node_id"
      },
      "nodeCountField": "subject_id"
    }
  }
};
const requiredCerts = [];
module.exports = { components, config, gaTracking, requiredCerts };