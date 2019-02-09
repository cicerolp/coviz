### Related Repositores [![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/cicerolp/coviz) [![GitHub license](https://img.shields.io/github/license/cicerolp/qds.svg)](https://github.com/cicerolp/qds/blob/master/LICENSE)

- [QDS Repository](https://github.com/cicerolp/qds)

# COVIZ - Visual Formation and Comparison of Patient Cohorts

We demonstrate COVIZ, an interactive system to visualize and explore patient cohorts. COVIZ seamlessly integrates cohort formation, exploration and visualization, making it a single destination to form and explore cohorts. COVIZis easy to use by medical experts and offers many features: (1) It provides the ability to isolate demographics (e.g., their age group and location), health markers (e.g., their body mass index), and treatments (e.g., Ventilation for respiratory problems), and hence facilitates cohort formation; (2) It summarizes the evolution of treatments of a cohort into health trajectories, and lets medical experts explore those trajectories; (3) It guides them in examining different facets of a cohort and generating hypotheses for future analysis; (4) Finally, it provides the ability to compare the statistics and health evolution of multiple cohorts at once. COVIZ relies on QDS, a novel data structure thatencodes and indexes various data distributions to enable their efficient retrieval. Additionally, COVIZ visualizes air quality data in the regions where patients live to provide explanations. We demonstrate two key scenarios. In the time-series scenario, COVIZ shows the temporal correlation between markers and pollutants. In the case cross-over scenario, COVIZ enables the comparison of different periods for each patient and helps unveil the impact of treatments, markers and pollution on that patient’s health. 

A video demonstration of COVIZ is available at [http://bit.ly/coviz-video](http://bit.ly/coviz-video).

# Authors

* Cícero A. L. Pahins
* Behrooz Omidvar-Tehrani
* Sihem Amer-Yahia
* Jean-Christian Borel
* Valérie Siroux
* João L. D. Comba
* Jean-Louis Pepin

# Online Demo
* Only Google Chrome is supported. Enable **loading of unsafe scripts**.

* [https://cicerolp.github.io/](https://cicerolp.github.io/)

# How to Build (Linux, Mac, and Windows are supported)

* Dependencies
    * [QDS](https://github.com/cicerolp/qds) server.
    * `Git Large File Storage (LFS) 2` or later.    
    * `PostgreSQL 10` or later.
    * `Node.js 10` or later.
    * `npm 6` or later.
    * `Python 2`.

* Instructions

    1. Before clonning this repo, install Git LFS.
        * Make sure you successfully pull the files inside `data` dir.

    2. Configure `PostgreSQL` (optional):
        * Import `data/health-trajectory.pgsql` into PostgreSQL.
        * Setup your credentials at `tools/represent-cohort/config.json`

    3. Open a new terminal to run the cohort visualization tool (depends on step #2 - Configure `PostgreSQL`):
        * Change the current directory to `tools/represent-cohort`. 
        * Hit `python2 init.py`

    4. Build [QDS](https://github.com/cicerolp/qds) server using branch `ftr-32bit-categories`.
        * Copy QDS binary (`nds`) to the root of this repo.
        * Open a new terminal to run QDS with: `NDS_DATA=data ./nds -x data/health-durations.xml -x data/pollution.xml -d 15` 

    5. Open a new terminal to build and run the interface:
        * Hit `npm install` to install all Angular requeriments.
        * Hit `ng serve` to deploy the development server.
        * Open [localhost:4200](http://localhost:4200) to access the interface.
            * Only available after you setup QDS server
