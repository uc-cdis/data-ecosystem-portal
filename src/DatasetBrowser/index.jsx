import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
// import DatasetBrowser from './DatasetBrowser';
import { config } from '../params';
// import { guppyUrl, tierAccessLevel, tierAccessLimit } from '../localconf';
// import './GuppyExplorer.css';
import DatasetBrowserTable from './DatasetBrowserTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import './DatasetBrowser.less';

const defaultConfig = {
  charts: {},
  filters: { tabs: [] },
  table: {
    enabled: true,
    fields: [],
  },
  guppyConfig: {
    dataType: 'subject',
    fieldMapping: [],
    manifestMapping: {
      resourceIndexType: 'file',
      resourceIdField: 'file_id', // TODO: change to object_id
      referenceIdFieldInResourceIndex: 'subject_id',
      referenceIdFieldInDataIndex: 'subject_id', // TODO: change to node_id
    },
  },
  buttons: [],
  dropdowns: {},
};

const defaultFileConfig = {
  charts: {},
  filters: { tabs: [] },
  table: {
    enabled: true,
    fields: [],
  },
  guppyConfig: {
    dataType: 'file',
    fieldMapping: [],
    manifestMapping: {
      resourceIndexType: 'subject',
      resourceIdField: 'subject_id',
      referenceIdFieldInResourceIndex: 'file_id', // TODO: change to object_id
      referenceIdFieldInDataIndex: 'file_id', // TODO: change to object_id
    },
  },
  buttons: [],
  dropdowns: {},
};

const datasetBrowserConfig = [
  _.merge(defaultConfig, config.dataExplorerConfig),
  _.merge(defaultFileConfig, config.fileExplorerConfig),
];

const routes = [
  '/explorer',
  '/files',
];

function action(input) {
  console.log(input);
  console.log('hey');
}

class Explorer extends React.Component {
  constructor(props) {
    super(props);
    const tabIndex = routes.indexOf(props.location.pathname);
    this.state = {
      tab: tabIndex > 0 ? tabIndex : 0,
    };
    this.filterGroupRef = React.createRef();

    const rawData = [
      {
        'dataset' : 'MACS',
        'supported_data_resource' : 'NDC: DAIDs Data Commons',
        'research_focus' : 'AIDS',
        'description': 'Having published over 1300 publications, the MACS has made significant contributions to understanding the science of HIV, the AIDS epidemic, and the effects of therapy. Many of these MACS publications have guided Public Health Policy.',
        'link' : 'https://daids.niaiddata.org'
      },
      {
        'dataset' : 'WIHS',
        'supported_data_resource' : 'NDC: DAIDs Data Commons',
        'research_focus' : 'AIDS',
        'description': 'The Women’s Interagency HIV Study (WIHS) is a large, comprehensive prospective cohort study designed to investigate the progression of HIV disease in women. The WIHS began in 1993 in response to growing concern about the impact of HIV on women. The core study visit includes a detailed and structured interview, physical and gynecologic examinations, and laboratory testing. After more than 20 years, the WIHS continues to investigate questions at the forefront of HIV research, spanning topics such as women’s reproductive health, clinical outcomes (for example, cardiovascular disease, diabetes, and others), and the effectiveness of antiretroviral therapy.',
        'link' : 'https://daids.niaiddata.org'
      } 
    ];

    this.state.rawData = this.mergeRawDataWithImmPortResults(rawData);
    this.state.filteredData = this.state.rawData;

    this.state.counts = { 
      'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', this.state.filteredData),
      'dataset': this.calculateSummaryCounts('dataset', this.state.filteredData)
    }
  }

  calculateSummaryCounts(field, filteredData) {
    const values = [];
    for(let j = 0; j < filteredData.length; j++) {
      values.push(filteredData[j][field]);
    }
    const uniqueValues = values.filter(
      (value, index) => values.indexOf(value) === index 
    );
    return uniqueValues.length;
  }

  authWithImmPort = () => {
    const immportAuthURL = "https://auth.immport.org/auth/token";
    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";

    const data = {
        username: "",
        password: ""
    };

    fetch(corsAnywhereURL + immportAuthURL, {
      method: "POST", 
      body: JSON.stringify(data)
    }).then(res => {
      console.log("Request complete! response:", res);
    });
  }

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  corsFetch = (URL) => {
    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";
    return fetch(corsAnywhereURL + URL);
  }

  obtainImmPortStudyDetails = async (studyAccessions) => {
    // ImmPort Docs are here http://docs.immport.org/#API/DataQueryAPI/dataqueryapi/
    let promiseArray = [];
    const summaryURL = 'https://api.immport.org/data/query/study/summary/';
    for (let i = 0; i <= studyAccessions.length; i++) {
      promiseArray.push(this.corsFetch(summaryURL + studyAccessions[i]).then(function(response) {
        console.log('study summary response: ', response);
        return response.json();
      }));
      await this.sleep(2000);
    }
    return Promise.all(promiseArray);
  }

  mergeRawDataWithImmPortResults = (rawData) => {
    const immportResults = [
      {
      "studyAccession" : "SDY1",
      "doi" : "10.21430/M38Y09R3R9",
      "title" : "Efficacy and Safety Evaluation of Allergen Immunotherapy Co-Administered with Omalizumab (an anti-IgE Monoclonal Antibody) (ITN019AD)",
      "pi" : "Thomas Casale - Creighton University School of Medicine",
      "conditionStudied" : "Seasonal allergy to ragweed",
      "briefDescription" : "A series of allergy shots may reduce symptoms of seasonal ragweed allergies. This study will determine whether taking a drug called omalizumab (also known as Xolair) before getting the allergy shots is more effective than allergy shots alone or other treatments, such as prescription antihistamines.",
      "startDate" : "2003-04-01",
      "detailedDescription" : "<p>Allergic rhinitis affects 20 to 40 million Americans annually. Allergy symptoms, which can range from mild to seriously debilitating, may affect quality of life. Left untreated, allergic rhinitis can exacerbate or trigger more serious conditions, such as asthma and sinus inflammation.</p><p>Individuals with allergies react to harmless particles such as dust or pollen. Proteins in the blood called IgE antibodies treat the harmless particles as invaders and trigger an immune system response. The immune response results in harmful inflammation of healthy tissues. In ragweed allergy, inflammation occurs in the airways and causes familiar allergy symptoms like sneezing, coughing, and general discomfort.</p><p>Omalizumab is an investigational drug that has been shown to block the effects of IgE antibodies. The blocking effect of omalizumab is temporary, but giving the drug to people before their regular allergy shots may make the shots more effective.</p><p>Participants in this study will be randomly assigned to receive injections of omalizumab or a placebo before an accelerated course of allergy shots (given over 12 weeks). The participants will return for follow-up for up to one year, and they may have as many as 27 study visits.</p>",
      "objectives" : "<p><b>Primary Objective: </b></p><p>To examine whether omalizumab given prior to RIT followed by 12 weeks of dual omalizumab and IT is more effective than RIT followed by IT alone in preventing the symptoms of ragweed-induced SAR. </p><p><b>Secondary Objective: </b></p><p>To examine whether omalizumab given prior to RIT followed by 12 weeks of dual omalizumab and IT is safe and more effective than omalizumab alone or placebo in preventing the symptoms of ragweed-induced SAR; to assess the immunologic mechanisms associated with the therapies; and to assess whether clinical tolerance has been achieved after discontinuation of the therapies.</p><p>Allergic rhinitis affects 20 to 40 million Americans annually. Allergy symptoms, which can range from mild to seriously debilitating, may affect quality of life. Left untreated, allergic rhinitis can exacerbate or trigger more serious conditions, such as asthma and sinus inflammation.</p><p>Individuals with allergies react to harmless particles such as dust or pollen. Proteins in the blood called IgE antibodies treat the harmless particles as invaders and trigger an immune system response. The immune response results in harmful inflammation of healthy tissues. In ragweed allergy, inflammation occurs in the airways and causes familiar allergy symptoms like sneezing, coughing, and general discomfort.</p><p>Omalizumab is an investigational drug that has been shown to block the effects of IgE antibodies. The blocking effect of omalizumab is temporary, but giving the drug to people before their regular allergy shots may make the shots more effective.</p><p>Participants in this study will be randomly assigned to receive injections of omalizumab or a placebo before an accelerated course of allergy shots (given over 12 weeks). The participants will return for follow-up for up to one year, and they may have as many as 27 study visits.</p>",
      "endpoints" : "<p><b>Primary Objective: </b></p><p>To examine whether omalizumab given prior to RIT followed by 12 weeks of dual omalizumab and <p><b>Primary Endpoint:</b></p><p>The primary endpoint will be the average daily allergy severity score, which will be calculated from 5 symptom scores of participants</p> <ul><li>sneezing; </li><li>rhinorrhea/runny nose;</li><li>itchy nose, throat, and palate;</li><li>itchy, watery eyes;</li><li>nasal congestion/stuffiness</li></ul>during the 2003 ragweed pollen season.<p>Symptom scores are recorded twice daily (AM and PM). </p><p>The ragweed pollen season begins when the ragweed pollen counts rise to 10 ragweed pollen grains/m<sup>3</sup>/24 hours or above on two consecutive recorded days, and the ragweed pollen season ends when the ragweed pollen counts fall below 10 ragweed pollen grains/m<sup>3</sup>/24 hours on two consecutive recorded days. The ragweed pollen season is from approximately August 15, 2003 to October 1, 2003, but varies among the sites. </p><p>The sum of the individual symptom scores will be averaged over AM and PM to give a daily score. Each daily score will then be averaged to obtain one measure of the average daily allergy severity score for each participant.  </p><p><b>Secondary Endpoint: </b></p><ol><li>The incidence and severity of adverse events;</li><li>Number of days with rescue medication use during the 2003 ragweed season;</li><li>Number of rescue medication capsules (fexofenadine HCl 60 mg) used during the 2003 ragweed season;</li><li>Rhinoconjunctivitis QOL questionnaire (RQLQ) scores during the 2003 ragweed season;</li><li>Daily AM allergy symptom scores during the 2003 ragweed season;</li><li>Daily PM allergy symptom scores during the 2003 ragweed season; and</li><li>Individual allergy symptom scores during the 2003 ragweed season.</li></ol>IT is more effective than RIT followed by IT alone in preventing the symptoms of ragweed-induced SAR. </p><p><b>Secondary Objective: </b></p><p>To examine whether omalizumab given prior to RIT followed by 12 weeks of dual omalizumab and IT is safe and more effective than omalizumab alone or placebo in preventing the symptoms of ragweed-induced SAR; to assess the immunologic mechanisms associated with the therapies; and to assess whether clinical tolerance has been achieved after discontinuation of the therapies.</p><p>Allergic rhinitis affects 20 to 40 million Americans annually. Allergy symptoms, which can range from mild to seriously debilitating, may affect quality of life. Left untreated, allergic rhinitis can exacerbate or trigger more serious conditions, such as asthma and sinus inflammation.</p><p>Individuals with allergies react to harmless particles such as dust or pollen. Proteins in the blood called IgE antibodies treat the harmless particles as invaders and trigger an immune system response. The immune response results in harmful inflammation of healthy tissues. In ragweed allergy, inflammation occurs in the airways and causes familiar allergy symptoms like sneezing, coughing, and general discomfort.</p><p>Omalizumab is an investigational drug that has been shown to block the effects of IgE antibodies. The blocking effect of omalizumab is temporary, but giving the drug to people before their regular allergy shots may make the shots more effective.</p><p>Participants in this study will be randomly assigned to receive injections of omalizumab or a placebo before an accelerated course of allergy shots (given over 12 weeks). The participants will return for follow-up for up to one year, and they may have as many as 27 study visits.</p>",
      "genderIncluded" : "Female, Male",
      "subjectsNumber" : 159,
      "downloadPackages" : null,
      "contractGrant" : "Immune Tolerance Network - Casale",
      "dataCompleteness" : "1 - Includes updates to the original data submission short of completeness.",
      "studyLinks" : [ {
        "studyLinkId" : 1,
        "name" : "Clinicaltrials.gov",
        "type" : "website",
        "value" : "http://clinicaltrials.gov/ct2/show/NCT00078195"
      }, {
        "studyLinkId" : 2,
        "name" : "ImmuneTolerance.org",
        "type" : "website",
        "value" : "http://www.immunetolerance.org/studies/efficacy-and-safety-evaluation-allergen-immunotherapy-co-administered-with-omalizumab-anti-i"
      } ],
      "studyPubmeds" : [ {
        "id" : {
          "studyAccession" : "SDY1",
          "pubmedId" : "16387596"
        },
        "authors" : "Casale TB(1), Busse WW, Kline JN, Ballas ZK, Moss MH, Townley RG, Mokhtarani M, Seyfert-Margolis V, Asare A, Bateman K, Deniz Y; Immune Tolerance Network Group.",
        "doi" : "b 2005 Dec 2.",
        "issue" : "117 1",
        "journal" : "J Allergy Clin Immunol.",
        "month" : "Jan",
        "pages" : "134-40",
        "title" : "Omalizumab pretreatment decreases acute reactions after rush immunotherapy for ragweed-induced seasonal allergic rhinitis.",
        "year" : "2006"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "pubmedId" : "17631952"
        },
        "authors" : "Klunker S(1), Saggar LR, Seyfert-Margolis V, Asare AL, Casale TB, Durham SR, Francis JN; Immune Tolerance Network Group.",
        "doi" : "b 2007 Jul 12.",
        "issue" : "120 3",
        "journal" : "J Allergy Clin Immunol.",
        "month" : "Sep",
        "pages" : "688-95",
        "title" : "Combination treatment with omalizumab and rush immunotherapy for ragweed-induced allergic rhinitis: Inhibition of IgE-facilitated allergen binding.",
        "year" : "2007"
      } ],
      "studyGlossarys" : [ {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "AE"
        },
        "definition" : "Adverse Event"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "ANOVA"
        },
        "definition" : "Analysis of Variance"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "CFR"
        },
        "definition" : "Code of Federal Regulations"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "CRF"
        },
        "definition" : "Case Report Form"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "CRO"
        },
        "definition" : "Contract Research Organization"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "CTC"
        },
        "definition" : "Common Toxicity Criteria"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "DSMB"
        },
        "definition" : "Data and Safety Monitoring Board"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "ECG "
        },
        "definition" : "Electrocardiogram"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "ELISPOT"
        },
        "definition" : "Enzyme-linked Immunospot"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "FEV"
        },
        "definition" : "Forced Expiratory Volume"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "GCP"
        },
        "definition" : "Good Clinical Practice"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "HAHA"
        },
        "definition" : "Human Anti-Human Antibodies"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IFN"
        },
        "definition" : "Interferon"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IgE"
        },
        "definition" : "Immunoglobulin E"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IL"
        },
        "definition" : "Interleukin"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IND"
        },
        "definition" : "Investigational New Drug"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IRB"
        },
        "definition" : "Institutional Review Board"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IT"
        },
        "definition" : "Immunotherapy"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "ITN"
        },
        "definition" : "Immune Tolerance Network"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "ITT"
        },
        "definition" : "Intent-to-treat"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "IV"
        },
        "definition" : "Intravenous"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "mAb"
        },
        "definition" : "Monoclonal Antibody"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "NCI"
        },
        "definition" : "National Cancer Institute"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "NIAID"
        },
        "definition" : "National Institute of Allergy and Infectious Diseases"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "NO"
        },
        "definition" : "Nitric Oxide"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "PBMC"
        },
        "definition" : "Peripheral Blood Mononuclear Cells"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "PCR"
        },
        "definition" : "Polymerase Chain Reaction"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "PP"
        },
        "definition" : "Per-protocol"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "QOL"
        },
        "definition" : "Quality Of Life"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "RES"
        },
        "definition" : "Reticuloendothelial System"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "RIT"
        },
        "definition" : "Rush Immunotherapy"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "RQLQ"
        },
        "definition" : "Rhinoconjunctivitis QOL Questionnaire"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "SAE"
        },
        "definition" : "Serious Adverse Event"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "SAEC"
        },
        "definition" : "Safety Serious Adverse Event Coordinator"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "SAR"
        },
        "definition" : "Seasonal Allergic Rhinitis"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "SC"
        },
        "definition" : "Subcutaneous"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "SMT"
        },
        "definition" : "Study Management Team"
      }, {
        "id" : {
          "studyAccession" : "SDY1",
          "term" : "TAG"
        },
        "definition" : "Tolerance Assay Group"
      } ]
    }, 
    {
      "studyAccession" : "SDY2",
      "doi" : "10.21430/M3G33VVU77",
      "title" : "Immune Response to Varicella Vaccination in Subjects with Atopic Dermatitis Compared to Nonatopic Controls (VAR 05)",
      "pi" : "Lynda Schneider - Children's Hospital, Boston",
      "conditionStudied" : "Immune Response to Varicella Vaccination in Subjects with Atopic Dermatitis",
      "briefDescription" : "Young children have the highest prevalence of atopic dermatitis (AD) and are at significant risk complications from vaccinia. As a surrogate, we believe investigating the immune response to varicella vaccination will yield important information about alterations in the immune response to live virus vaccines  subjects with AD. Evaluation of 30 analyzable children with AD and 30 analyzable nonatopic controls is planned. Subjects immunized with varicella vaccine will have blood drawn for laboratory evaluations 3 weeks after immunization. The immune response to varicella will be assessed by measuring the proportion of varicella-zoster virus (VZV)-specific T cells, perforin production, and VZV-specific antibody titers. Because of the and systemic T helper cell 2 (Th2) polarization of subjects with AD, an altered response to varicella vaccination expected. Specifically, it is expected that AD subjects will exhibit decreased cell-mediated responses, but exhibit normal to increased humoral responses as evidenced by production of VZV-specific antibodies.",
      "startDate" : "",
      "detailedDescription" : "This is a mechanistic, double-aim, non-randomized study that will be conducted at 2 sites, Children's Hospital Boston and National Jewish Medical and Research Center. Study participants 12 to 36 months of age with AD and without AD will be enrolled to assess immune response after varicella vaccination.<br/><br/>Estimated Study Duration:<br/><br/>The study is scheduled to be completed in 36 months. Subjects will only complete one scheduled study visit.<br/><br/>Study Population:<br/><br/>Subjects will be enrolled over a 12 month period. Subjects will be recruited at Children's Hospital Boston and National Jewish Medical and Research Center.<br/>",
      "objectives" : "Primary Objective:<br/>To determine if children with AD have VZV-specific cell mediated immune (CMI) responses to varicella vaccination that differ from those of nonatopic controls.<br/><br/>Secondary Objective:<br/>To determine if children with AD have VZV-specific humoral responses to varicella vaccination that differ from those of nonatopic controls.",
      "endpoints" : "Primary Endpoint:<br/>Cell-mediated immune responses as assessed by measurement of numbers of VZV-specific T cells utilizing an interferon (IFN)-gamma enzyme-linked immunosorbent spot (ELISPOT) assay and perforin generation using 2-color flow cytometry staining for both CD8 and perforin.<br/><br/>Secondary Endpoint:<br/>Comparison of VZV-specific (immunoglobin class and type) antibody between AD and nonatopic, control groups.",
      "genderIncluded" : "Female, Male",
      "subjectsNumber" : 71,
      "downloadPackages" : null,
      "contractGrant" : "Atopic Dermatitis and Vaccinia Network (ADVN) Clinical Studies Consort-26629c",
      "dataCompleteness" : "2 - Complete set of descriptive data and results, as ascertained by ImmPort.",
      "studyLinks" : [ {
        "studyLinkId" : 68,
        "name" : "ClinicalTrials.gov",
        "type" : "website",
        "value" : "http://clinicaltrials.gov/ct2/show/study/NCT00406081"
      } ],
      "studyPubmeds" : [ ],
      "studyGlossarys" : [ {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "ACIP"
        },
        "definition" : "Advisory Committee on Immunization Practices "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "AD"
        },
        "definition" : "Atopic Dermatitis "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "ADVN"
        },
        "definition" : "Atopic Dermatitis Vaccinia Network "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "AE"
        },
        "definition" : "Adverse Event "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Arms"
        },
        "definition" : "This includes the external axillae and hands."
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CBC"
        },
        "definition" : "Complete Blood Count "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CDC"
        },
        "definition" : "Centers for Disease Control "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CLIA"
        },
        "definition" : "Clinical Laboratory Improvement Amendments "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CMI"
        },
        "definition" : "Cell-mediated Immunity "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CRF"
        },
        "definition" : "Case Report Form "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CTCAE"
        },
        "definition" : "Common Terminology Criteria for Adverse Events "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "CTL"
        },
        "definition" : "Cytotoxic T Lymphocyte "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "DAIT"
        },
        "definition" : "Division of Allergy, Immunology, and Transplantation "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "DSMB"
        },
        "definition" : "Data and Safety Monitoring Board "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "EASI"
        },
        "definition" : "Eczema Area and Severity Index "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "EDC"
        },
        "definition" : "Electronic Data Capture "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "EH"
        },
        "definition" : "Eczema Herpeticum "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "ELISA"
        },
        "definition" : "Enzyme-linked Immunosorbent Assay "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "ELISPOT"
        },
        "definition" : "Enzyme-linked Immunosorbent Spot "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "EV"
        },
        "definition" : "Eczema Vaccinatum "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "FDA"
        },
        "definition" : "Food and Drug Administration "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "GCP"
        },
        "definition" : "Good Clinical Practice "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Head"
        },
        "definition" : "This includes the head and neck."
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "HSV"
        },
        "definition" : "Herpes Simplex Virus "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "ICH"
        },
        "definition" : "International Conference on Harmonisation"
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "IFN"
        },
        "definition" : "Interferon "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Ig"
        },
        "definition" : "Immunoglobulin "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "IL"
        },
        "definition" : "Interleukin "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "IND"
        },
        "definition" : "Investigational New Drug "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "IRB"
        },
        "definition" : "Institutional Review Board "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Legs"
        },
        "definition" : "This area includes the buttocks and feet."
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "MC"
        },
        "definition" : "Molluscum Contagiosum "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "MHC"
        },
        "definition" : "Major Histocompatibility Complex "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "NIAID"
        },
        "definition" : "National Institute of Allergy and Infectious Diseases "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "NK"
        },
        "definition" : "Natural Killer "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "PBMC"
        },
        "definition" : "Peripheral Blood Mononuclear Cell "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "RAST"
        },
        "definition" : "Radioallergosorbent Assay "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "SAE"
        },
        "definition" : "Serious Adverse Event "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "SDCC"
        },
        "definition" : "Statistical and Data Coordinating Center "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Th"
        },
        "definition" : "T Helper Cell "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "TNF"
        },
        "definition" : "Tumor Necrosis Factor "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "Trunk"
        },
        "definition" : "This area includes the internal axillae and groin."
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "USA"
        },
        "definition" : "United States of America "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "VZIG"
        },
        "definition" : "Varicella Zoster Immune Globulin "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "VZV"
        },
        "definition" : "Varicella-zoster Virus "
      }, {
        "id" : {
          "studyAccession" : "SDY2",
          "term" : "WHO"
        },
        "definition" : "World Health Organization "
      } ]
    }
    ];
    
    for (let i = 0; i < immportResults.length; i++) {
      const newObject = {
        'dataset': immportResults[i].studyAccession,
        'description': immportResults[i].briefDescription,
        'research_focus': immportResults[i].conditionStudied,
        'link': 'https://www.immport.org/shared/study/' + immportResults[i].studyAccession,
        'supported_data_resource': 'ImmPort'
      };
      rawData.push(newObject);
    }
    return rawData;
  }

  fetchAndUpdateRawData = () => {
    return;
    console.log('here i am');
    const mergedData = [];

    // this.authWithImmPort();

    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";
    const immportURL = "https://api.immport.org/data/query/study/findAllStudyAccessions";
    const tbURL = ""
    const googleURL = "https://google.com/"

    fetch(corsAnywhereURL + immportURL)
      .then(response => { 
        console.log(response);
        return response.json();
      })
      .then(data => {
        console.log('hi: ', data);
        if (data.studyAccessions && data.studyAccessions.length > 0) {
          const promiseArray = this.obtainImmPortStudyDetails(data.studyAccessions);
          console.log(promiseArray);

        }
      });


    this.setState({rawData: mergedData});
    return Promise.resolve({});
  }

  /**
   * This function contains partial rendering logic for filter components.
   * It transfers aggregation data (`this.state.receivedAggsData`) to items inside filters.
   * But before that, the function first calls `this.props.onProcessFilterAggsData`, which is
   * a callback function passed by `ConnectedFilter`'s parent component, so that the parent
   * component could do some pre-processing modification about filter.
   */
  getFilterTabs() {
    return [];
    const processedTabsOptions = this.props.onProcessFilterAggsData(this.state.receivedAggsData);
    if (!processedTabsOptions || Object.keys(processedTabsOptions).length === 0) return null;
    const { fieldMapping } = this.props;
    const tabs = this.props.filterConfig.tabs.map(({ fields }, index) => (
      <FilterList
        key={index}
        sections={
          getFilterSections(fields, fieldMapping, processedTabsOptions, this.state.initialAggsData)
        }
        tierAccessLimit={this.props.tierAccessLimit}
      />
    ));
    return tabs;
  }

  checkIfFiltersApply(filtersApplied, row) {
    for (var property in filtersApplied) {
      const filtersApplyMatch = filtersApplied[property].selectedValues.map(
        x => x.toLowerCase()
      ).includes(
        row[property].toLowerCase()
      );
      const filtersApplyContains = filtersApplied[property].selectedValues.filter(
        x => row[property].toLowerCase().includes(x.toLowerCase())
      );
      filtersApplyContains = filtersApplyContains.length > 0;
      const filtersApply = filtersApplyMatch || filtersApplyContains;
      if (!filtersApply) {
        return false;
      }
    }
    return true;
  }

  handleFilterChange(filtersApplied) {
    const rawData = this.state.rawData;
    let filteredData = [];
    for(let j = 0; j < rawData.length; j++) {
      const isMatch = this.checkIfFiltersApply(filtersApplied, rawData[j]);
      if(isMatch) {
        filteredData.push(rawData[j]);
      }
    }
    
    this.setState({
      filteredData : filteredData,
      'counts' : 
        { 
          'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', filteredData),
          'dataset': this.calculateSummaryCounts('dataset', filteredData)
        }
    });
  }

  render() {
    const filterTabs = this.getFilterTabs();

    const projectOptions = [
      { text: 'NDC: TB Data Commons', filterType: 'singleSelect', count: 123 },
      { text: 'ImmPort', filterType: 'singleSelect', count: 123 },
      { text: 'NDC: DAIDs Data Commons', filterType: 'singleSelect', count: 123 }
    ];

    const studyOptions = [
      { text: 'AIDS', filterType: 'singleSelect', count: 123 },
      { text: 'TB', filterType: 'singleSelect', count: 123 },
      { text: 'Immune Response', filterType: 'singleSelect', count: 123 },
      { text: 'Allergy', filterType: 'singleSelect', count: 123 },
      { text: 'Atopy', filterType: 'singleSelect', count: 123 },
      { text: 'Infection Response', filterType: 'singleSelect', count: 123 },
      { text: 'Vaccine Response', filterType: 'singleSelect', count: 123 },
      { text: 'Transplantation', filterType: 'singleSelect', count: 123 },
      { text: 'Oncology', filterType: 'singleSelect', count: 123 },
      { text: 'Autoimmune', filterType: 'singleSelect', count: 123 },
      { text: 'Preterm Birth', filterType: 'singleSelect', count: 123 }
    ];

    const genderOptions = [
      { text: 'Male', filterType: 'singleSelect', count: 123 },
      { text: 'Female', filterType: 'singleSelect', count: 123 },
    ];

    const raceOptions = [
      { text: 'White', filterType: 'singleSelect', count: 123 },
      { text: 'Black', filterType: 'singleSelect', count: 123 },
      {
        text: 'American Indian or Alaskan Nativ',
        filterType: 'singleSelect',
        count: 123,
      },
      { text: 'Asian/Pacific Islander', filterType: 'singleSelect', count: 123 },
      { text: 'Multiracial', filterType: 'singleSelect', count: 123 },
      { text: 'Other', filterType: 'singleSelect', count: 123 },
    ];

    const ethnicityOptions = [
      { text: 'Hispanic or Latino', filterType: 'singleSelect', count: 123, accessible: true },
      { text: 'Not Hispanic or Latino', filterType: 'singleSelect', count: 123, accessible: false },
      { text: 'Unknown', filterType: 'singleSelect', count: 123, accessible: true },
      { text: 'Not Specified', filterType: 'singleSelect', count: -1, accessible: true },
    ];

    const ageOptions = [
      { min: 2, max: 97, filterType: 'range' },
    ];

    const fileTypeOptions = [
      { text: 'mRNA Array', filterType: 'singleSelect', count: 123 },
      { text: 'Unaligned Reads', filterType: 'singleSelect', count: 123 },
      { text: 'Lipidomic MS', filterType: 'singleSelect', count: 123 },
      { text: 'Proteomic MS', filterType: 'singleSelect', count: 123 },
      { text: 'Metabolomic MS', filterType: 'singleSelect', count: 123 },
    ];

    const fileCountOptions = [
      { min: 2, max: 97, filterType: 'range' },
    ];

    const projectSections = [
      { title: 'Supported Data Resources', options: projectOptions },
      { title: 'Research Focus', options: studyOptions },
    ];

    const subjectSections = [
      { title: 'Gender', options: genderOptions },
      { title: 'Race', options: raceOptions },
      { title: 'Ethnicity', options: ethnicityOptions },
      { title: 'Age', options: ageOptions },
    ];

    const fileSections = [
      { title: 'File Types', options: fileTypeOptions },
      { title: 'File Counts', options: fileCountOptions },
    ];

    const tabs = [
      <FilterList key={0} sections={projectSections} /> //, <FilterList key={1} sections={subjectSections} />, <FilterList key={2} sections={fileSections} />,
    ];

    
    const supportedDataResourceCount = {
      label: 'Supported Data Resources',
      value: this.state.counts['supported_data_resource']
    };
    
    const datasetCount = {
      label: 'Datasets',
      value: this.state.counts['dataset']
    };

    const summaries = [supportedDataResourceCount, datasetCount];

    const totalCount = this.state.rawData.length;

    const config = {
      'fieldMapping' : [
        { 'field': 'dataset', 'name': 'Dataset' },
        { 'field': 'supported_data_resource', 'name': 'Supported Data Resource' },
        { 'field': 'research_focus', 'name': 'Research Focus' },
        { 'field': 'description', 'name': 'Description of Dataset' },
        { 'field': 'link', 'name': 'Action' }
      ]
    }

    let fields = [];
    for(let j = 0; j < config.fieldMapping.length; j++) {
      fields.push(config.fieldMapping[j].field);
    }
    const tableConfig = { fields: fields };

    const filterConfig = {
      tabs: [{
        title: 'Filters',
        fields: ["supported_data_resource", "research_focus"],
      }],
    };

    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Datasets Browser
        </div>
        <div className='dataset-browser'>
          <div className='dataset-browser__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={filterConfig}
              onFilterChange={ (e) => this.handleFilterChange(e) }
            />
          </div>
          <div className='data-explorer__visualizations'>
            {
              <div className='guppy-explorer-visualization__charts'>
                <DataSummaryCardGroup summaryItems={summaries} connected />
              </div>
            }
            <DatasetBrowserTable
                className='guppy-explorer-visualization__table'
                tableConfig={tableConfig}
                fetchAndUpdateRawData={this.fetchAndUpdateRawData}
                filteredData={this.state.filteredData}
                totalCount={this.props.totalCount}
                guppyConfig={config}
                isLocked={false}
                totalCount={totalCount}
              />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

Explorer.propTypes = {
  history: PropTypes.object.isRequired, // inherited from ProtectedContent
  location: PropTypes.object.isRequired,
};

export default Explorer;
