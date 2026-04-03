# Manual Testing Evidence

The following manual tests were used to verify implemented dashboard behaviours through direct interaction with the running system. The evidence focuses on observed frontend-backend integration, recommendation execution, scenario management, history inspection, comparison output, and export features. Only completed tests with confirmed outcomes are marked as passed. Tests that still require execution remain explicitly unfinished.

## TC-001

**Test ID:**  
TC-001

**Test name:**  
Live API connection state

**Purpose:**  
To verify that the dashboard is connected to the backend service and is using live backend data.

**Input / action:**  
1. Open the dashboard homepage.  
2. View the API Status panel.  
3. Confirm the connection and result-source indicators.

**Expected result:**  
The API Status panel should show that the connection is online, the health state is ok, and the result source indicates live backend.

**Actual result:**  
The dashboard API Status panel displayed:
- Connection: Online
- Health: ok
- Result source: Live backend

**Pass / fail:**  
Pass

**Screenshot filename:**  
B3_api_status_live_backend.png

**Short note for report use:**  
Manual verification that the frontend was connected to the locally running FastAPI backend and receiving live results during dashboard operation.

## TC-002

**Test ID:**  
TC-002

**Test name:**  
Balanced recommendation run

**Purpose:**  
To verify that the system can execute a standard balanced recommendation and return ranked output for a valid scenario.

**Input / action:**  
1. Enter:
   - Scenario name: Balanced Demo
   - Average CPU usage: 45
   - Peak CPU usage: 75
   - Runtime hours: 24
   - Region: EU (Ireland)
   - Storage type: General Purpose SSD (gp3)
   - Storage size: 100
   - Optimisation objective: Balanced
2. Run the recommendation.

**Expected result:**  
The system should return a recommendation summary, KPI cards, and ranked candidate output for the balanced scenario.

**Actual result:**  
The dashboard returned a completed recommendation result for the balanced scenario, including KPI cards and a recommendation summary. The best balanced choice shown was c6a.24xlarge.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A3_live_recommendation_result.png

**Short note for report use:**  
Manual execution of a valid balanced scenario showing successful end-to-end recommendation output.

## TC-003

**Test ID:**  
TC-003

**Test name:**  
Cost-priority run

**Purpose:**  
To verify that the system can execute a recommendation using the cost optimisation objective.

**Input / action:**  
1. Enter a valid scenario.  
2. Set Optimisation objective to Cost.  
3. Run the recommendation.

**Expected result:**  
The system should return a ranked recommendation result based on the cost-priority weighting.

**Actual result:**  
The dashboard completed the recommendation run with the Cost objective selected and returned ranked output, KPI cards, and a recommendation summary for the tested scenario. The workflow responded correctly to the objective selection, although the visible ranking difference from other objectives was limited in this test case.

**Pass / fail:**  
Pass

**Screenshot filename:**  
TC03_cost_priority_run.png

**Short note for report use:**  
Manual test of the cost-priority objective to verify that the ranking workflow responds to objective selection.

## TC-004

**Test ID:**  
TC-004

**Test name:**  
Performance-priority run

**Purpose:**  
To verify that the system can execute a recommendation using the performance optimisation objective.

**Input / action:**  
1. Enter a valid scenario.  
2. Set Optimisation objective to Performance.  
3. Run the recommendation.

**Expected result:**  
The system should return a ranked recommendation result based on the performance-priority weighting.

**Actual result:**  
The dashboard completed the recommendation run with the Performance objective selected and returned ranked output, KPI cards, and a recommendation summary for the tested scenario. The workflow responded correctly to the objective selection, although the visible difference from other objective settings was not always straightforward to interpret from a single screenshot.

**Pass / fail:**  
Pass

**Screenshot filename:**  
TC04_performance_priority_run.png

**Short note for report use:**  
Manual test of the performance-priority objective to verify that the ranking workflow responds to objective selection.

## TC-005

**Test ID:**  
TC-005

**Test name:**  
Region change impact

**Purpose:**  
To verify that changing the selected region affects the recommendation output and/or pricing context.

**Input / action:**  
1. Enter a valid scenario.  
2. Run the recommendation in one region.  
3. Change the region to a different valid region.  
4. Run the recommendation again.

**Expected result:**  
The recommendation output should update to reflect the selected region and its associated pricing/context.

**Actual result:**  
The dashboard completed both runs successfully and updated the recommendation context after the region change. The top recommendation remained c6g.large in both cases, but the total cost changed from US$20.99 in EU (Ireland) to US$19.48 in US East (N. Virginia), confirming that regional pricing was applied.

**Pass / fail:**  
Pass

**Screenshot filename:**  
TC05_region_change_impact.png

**Short note for report use:**  
Manual verification that the dashboard responds to regional configuration changes in the recommendation workflow.

## TC-006

**Test ID:**  
TC-006

**Test name:**  
Storage size impact

**Purpose:**  
To verify that changing storage size affects the recommendation calculation and output.

**Input / action:**  
1. Enter a valid scenario.  
2. Run the recommendation with one storage size.  
3. Change storage size.  
4. Run the recommendation again.

**Expected result:**  
The output should update to reflect the changed storage requirement, including any change in cost-related values.

**Actual result:**  
The dashboard completed both runs successfully and updated the cost-related output after the storage change. With storage size set to 120 GB, the total cost was US$20.99 and the storage cost was US$3.47. After increasing storage size to 600 GB, the total cost increased to US$34.88 and the storage cost increased to US$17.36. The dashboard updated normally while the top recommendation remained stable.

**Pass / fail:**  
Pass

**Screenshot filename:**  
Screenshot 2026-04-02 230037.png  
Screenshot 2026-04-02 230254.png

**Short note for report use:**  
Manual verification that the recommendation output updates when storage demand is changed.

## TC-007

**Test ID:**  
TC-007

**Test name:**  
Benchmark scenario execution

**Purpose:**  
To verify that a predefined benchmark scenario can be selected and executed from the benchmark panel.

**Input / action:**  
1. Open the Benchmark scenarios panel.  
2. Select the preset benchmark “High Storage / Moderate CPU”.  
3. Run the benchmark scenario.

**Expected result:**  
The benchmark scenario should execute successfully and update the dashboard output using the preset workload profile.

**Actual result:**  
The benchmark scenario panel was used to run the preset “High Storage / Moderate CPU” case, and the dashboard displayed updated comparison output after execution.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A12_benchmark_scenario_execution.png

**Short note for report use:**  
Manual execution of a predefined benchmark scenario showing repeatable preset-based recommendation testing.

## TC-008

**Test ID:**  
TC-008

**Test name:**  
Save scenario

**Purpose:**  
To verify that a user-defined scenario can be saved and stored for later reuse.

**Input / action:**  
1. Enter a valid scenario.  
2. Use the save scenario action.  
3. Check the Saved scenarios panel.

**Expected result:**  
The scenario should be saved and appear in the Saved scenarios list with a load option.

**Actual result:**  
The scenario “Saved Scenario Demo” appeared in the Saved scenarios panel with its saved metadata and a Load action.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A9_saved_scenario_workflow.png

**Short note for report use:**  
Manual verification that a scenario can be persisted and listed for later reuse.

## TC-009

**Test ID:**  
TC-009

**Test name:**  
Load saved scenario

**Purpose:**  
To verify that a previously saved scenario can be reloaded into the dashboard.

**Input / action:**  
1. Open the Saved scenarios panel.  
2. Select a saved scenario.  
3. Click Load.

**Expected result:**  
The selected saved scenario should reload its stored configuration into the dashboard.

**Actual result:**  
The selected saved scenario reloaded its stored configuration into the dashboard controls, and the workload/configuration values updated correctly after the Load action was used. This behaviour was manually verified in the running system, although it is less straightforward to demonstrate fully in a single static screenshot.

**Pass / fail:**  
Pass

**Screenshot filename:**  
TC09_load_saved_scenario.png

**Short note for report use:**  
Manual verification that previously saved scenario profiles can be reloaded into the interface.

## TC-010

**Test ID:**  
TC-010

**Test name:**  
Delete scenario

**Purpose:**  
To verify that a saved scenario can be removed from the saved list.

**Input / action:**  
1. Open the Saved scenarios panel.  
2. Select a saved scenario.  
3. Use the delete action.

**Expected result:**  
The selected scenario should be removed from the saved scenario list.

**Actual result:**  
The selected saved scenario was deleted successfully after the two-step in-app confirmation flow was completed. Scenario #112 (“Saved Scenario Demo”) was visible before deletion, both confirmation dialogs appeared as expected, and the scenario no longer appeared in the Saved scenarios list afterwards. The saved scenario count also reduced from 43 to 42.

**Pass / fail:**  
Pass

**Screenshot filename:**  
Screenshot 2026-04-02 232416.png  
Screenshot 2026-04-02 232424.png  
Screenshot 2026-04-02 232430.png  
Screenshot 2026-04-02 232442.png

**Short note for report use:**  
Manual verification of saved-scenario deletion behaviour within the persistence workflow.

## TC-011

**Test ID:**  
TC-011

**Test name:**  
Recent run inspect flow

**Purpose:**  
To verify that a previously recorded recommendation run can be selected and inspected in detail.

**Input / action:**  
1. Open the Recent recommendation runs panel.  
2. Select a recorded run.  
3. Click Inspect.

**Expected result:**  
The selected run should open in the run detail panel and display stored metadata and recommendation information.

**Actual result:**  
The Recent recommendation runs panel showed stored executions, and selecting Run #105 displayed the Selected run details panel with scenario metadata, inputs, execution summary, and recorded recommendation data.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A10_recent_run_history.png  
A11_selected_run_detail_panel.png

**Short note for report use:**  
Manual verification that historical recommendation runs are stored and can be reopened for detailed inspection.

## TC-012

**Test ID:**  
TC-012

**Test name:**  
Comparison table population

**Purpose:**  
To verify that the comparison table populates with shortlisted candidates for side-by-side comparison.

**Input / action:**  
1. Run a valid recommendation scenario.  
2. Navigate to the Comparison table section.

**Expected result:**  
The comparison table should display shortlisted candidate rows with key comparison fields.

**Actual result:**  
The comparison table displayed three populated candidate rows with instance name, vCPU, memory, total cost, performance score, fit score, and recommendation score.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A8_comparison_table_populated.png

**Short note for report use:**  
Manual verification that the dashboard can render side-by-side candidate comparison data after a recommendation run.

## TC-013

**Test ID:**  
TC-013

**Test name:**  
Export CSV

**Purpose:**  
To verify that the dashboard provides CSV export for recommendation/run evidence.

**Input / action:**  
1. Open the Evidence exports panel.  
2. Click Export results CSV.

**Expected result:**  
The system should generate or trigger download of a CSV export for the current recommendation/run context.

**Actual result:**  
The Evidence exports panel successfully triggered a CSV download for the current dashboard state. The browser download history showed the file `region-change-demo-recommendations.csv` completed successfully, confirming that CSV export worked as expected.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A13_export_panel.png  
TC13_export_csv_success.png

**Short note for report use:**  
Manual verification of CSV export support for dashboard evidence output.

## TC-014

**Test ID:**  
TC-014

**Test name:**  
Export JSON

**Purpose:**  
To verify that the dashboard provides JSON export for run data.

**Input / action:**  
1. Open the Evidence exports panel.  
2. Click Export run JSON.

**Expected result:**  
The system should generate or trigger download of a JSON export for the selected run.

**Actual result:**  
The Evidence exports panel successfully triggered a JSON download for the selected run. The browser download history showed the file `run-156-detail.json` completed successfully, confirming that JSON export worked as expected.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A13_export_panel.png  
TC14_export_json_success.png

**Short note for report use:**  
Manual verification of JSON export support for structured run data output.

## TC-015

**Test ID:**  
TC-015

**Test name:**  
Export TXT

**Purpose:**  
To verify that the dashboard provides TXT summary export for recommendation evidence.

**Input / action:**  
1. Open the Evidence exports panel.  
2. Click Export summary TXT.

**Expected result:**  
The system should generate or trigger download of a TXT summary export for the current recommendation/run context.

**Actual result:**  
The Evidence exports panel successfully triggered a TXT summary download for the current dashboard state. The browser download history showed the file `region-change-demo-evidence-summary.txt` completed successfully, confirming that TXT export worked as expected.

**Pass / fail:**  
Pass

**Screenshot filename:**  
A13_export_panel.png  
TC15_export_txt_success.png

**Short note for report use:**  
Manual verification of TXT summary export support for compact recommendation evidence output.

## Completed evidence-backed tests

- TC-001
- TC-002
- TC-003
- TC-004
- TC-005
- TC-006
- TC-007
- TC-008 
- TC-009
- TC-010 
- TC-011
- TC-012
- TC-013
- TC-014
- TC-015