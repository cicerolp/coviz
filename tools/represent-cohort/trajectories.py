# ********** ABOUT **********
# This Python library contains all functions for representing and exploring cohorts.

import psycopg2
import operator
import time
import sequence_matching
import random
import logging
import json

# logging.basicConfig(filename='trajectories.log',level=logging.INFO)
# logging.getLogger().setLevel(logging.INFO)

# ANALYZE CONFIGURATIONS
with open('config.json') as config_file:
    configs = json.load(config_file)

db_host = ""
db_pwd = ""
db_user = ""
dbname = ""
sampling_ratio = ""

for config in configs:
    for s in configs[config]:
        if s == "host":
            db_host = configs[config][s]
        if s == "password":
            db_pwd = configs[config][s]
        if s == "user":
            db_user = configs[config][s]
        if s == "dbname":
            dbname = configs[config][s]
        if s == "sampling_ratio":
            sampling_ratio = configs[config][s]

conn = psycopg2.connect("dbname='"+dbname+"' user='" +
                        db_user+"' host='"+db_host+"' password='"+db_pwd+"'")
cur = conn.cursor()


class Event:
    def __init__(self, name, month, confidence):
        self.name = name  # The name of the treatment, "OXY", "PPC", etc. plus "_" plus "B" for begin and "E" for end
        self.month = month  # How many months after the first activity of the patient
        self.confidence = confidence

    def __repr__(self):
        return repr((self.name, self.month, self.confidence))


class CohortEvent:
    def __init__(self, name, confidence):
        self.name = name  # The name of the treatment, "OXY", "PPC", etc. plus "_" plus "B" for begin and "E" for end
        self.confidence = confidence

    def __repr__(self):
        return repr((self.name, self.confidence))


def month_diff(first_date, current_date):
        # I've hard-coded the granularity of month here
        # 2016-09-05 00:00:00
    first_year = int(first_date[0:4])
    first_month = int(first_date[5:7])
    current_year = int(current_date[0:4])
    current_month = int(current_date[5:7])
    return abs(abs(current_year-first_year)*12 + (first_month - current_month) + 1)


def retrieve_trajectories(patient_id, all_trajectories_info):
    event_list = []
    first_date_ever = ""
    event_cnt = 0
    for trajectory_info in all_trajectories_info:
        if str(trajectory_info[5]) == str(patient_id):
            if event_cnt == 0:
                first_date_ever = str(trajectory_info[0])
            the_value = trajectory_info[2]
            event_list.append(
                Event(the_value+"_B", month_diff(str(trajectory_info[0]), first_date_ever), 100))
            event_list.append(
                Event(the_value+"_E", month_diff(str(trajectory_info[1]), first_date_ever), 100))
            event_cnt = event_cnt + 1
        if int(trajectory_info[5]) > int(patient_id):
            break
    sorted_events = sorted(event_list, key=operator.attrgetter('month'))
    return sorted_events


def get_info_cohort_members(cohort_query):
    cur.execute(cohort_query)
    rows = cur.fetchall()
    return rows


def get_all_trajectories(cohort_query):
    extended_query = "select from_date,to_date,value,category,entity,id_patient from activities where entity = 'treatment' and type = 'pec' and id_patient in ("+cohort_query[
        :-1]+") order by id_patient, to_date"
    cur.execute(extended_query)
    rows = cur.fetchall()
    return rows


def update_cohort_longest_trajectory(cohort_longest_trajectory, patient_trajectory):
    if cohort_longest_trajectory < patient_trajectory[-1].month:
        return patient_trajectory[-1].month
    else:
        return cohort_longest_trajectory


def initialize_cohort_behavior(cohort_longest_trajectory):
    cohort_behavior = {}
    for i in range(0, cohort_longest_trajectory+1):
        cohort_behavior[i] = []
    return cohort_behavior


def represent_cohort(cohort_query, density_threshold, func_action="represent"):
    cohort_longest_trajectory = 0
    cohort_trajectories = {}
    cohort_members = {}
    member_cnt = 0
    all_match_matrixes = ""
    patients_info = get_info_cohort_members(cohort_query)
    all_trajectories_info = get_all_trajectories(cohort_query)
    logging.info("cohort size to represent: "+str(len(patients_info)))
    # get patients info (patient ids, trajectories)
    start_time = time.time()
    for patient_info in patients_info:
        patient_id = patient_info[0]
        cohort_members[member_cnt] = patient_id
        member_cnt += 1
        patient_trajectory = retrieve_trajectories(
            patient_id, all_trajectories_info)
        cohort_trajectories[patient_id] = patient_trajectory
        cohort_longest_trajectory = update_cohort_longest_trajectory(
            cohort_longest_trajectory, patient_trajectory)
    end_time = time.time()
    time_length = (end_time - start_time) * 1000
    logging.info("extracted trajectories in "+str(time_length)[0:4]+" ms.")
    # if member_cnt < 10:
    # 	return -1
    # trajectory matching
    start_time = time.time()
    sum_scores = 0
    cnt_scores = 0
    # sample_rate = 0.01 # hard coded to see time efficiency
    # dynamic to obtain only 20 patients for whatever big cohort
    sample_rate = float(sampling_ratio) / float(member_cnt)
    # sample_rate = 1
    for i in range(0, member_cnt):
        for j in range(i+1, member_cnt):
            to_pick = random.random()
            if to_pick <= sample_rate:
                match_score, match_matrix = sequence_matching.compute_needleman_wunsch(
                    cohort_trajectories[cohort_members[i]], cohort_trajectories[cohort_members[j]], "score_seq")
                sum_scores += match_score
                cnt_scores += 1
                all_match_matrixes += " "+match_matrix
    if cnt_scores == 0:
        cnt_scores = 0.001
    avg_score = float(sum_scores) / float(cnt_scores)
    end_time = time.time()
    time_length = end_time - start_time
    logging.info("matched trajectories in "+str(time_length) +
                 " seconds (made "+str(cnt_scores)+" comparisons).")
    if func_action == "score":
        return float(str(avg_score)[0:4])
    # make behavior matrix
    cohort_behavior = initialize_cohort_behavior(cohort_longest_trajectory)
    cohort_action_names = []
    match_matrix_actions = all_match_matrixes.split(" ")
    for match_matrix_action in match_matrix_actions:
        if match_matrix_action != "" and match_matrix_action != None:
            parts = match_matrix_action[1:-1].split(",")
            event_month1 = parts[1]
            event_month2 = parts[3]
            event_name = parts[0]
            which_cell = abs(int(event_month1)+int(event_month2))/2
            new_behavior = CohortEvent(event_name, abs(
                int(event_month1)-int(event_month2)))
            cohort_behavior[which_cell].append(new_behavior)
    # maximum number of times an action is repeated in the cohort.
    max_frequency = 1
    final_rep = ""
    virtual_patient = []
    for cell in cohort_behavior:
        set_notion = []
        frequency = {}
        if len(cohort_behavior[cell]) != 0:
            for action in cohort_behavior[cell]:
                if action.name not in set_notion:
                    set_notion.append(action.name)
                    frequency[action.name] = 1
                else:
                    frequency[action.name] += 1
                    if frequency[action.name] > max_frequency:
                        max_frequency = frequency[action.name]
            for unique_action in set_notion:
                ratio = float(frequency[unique_action]) / \
                    float(max_frequency) * 100
                if ratio >= density_threshold:
                    final_rep += "t" + \
                        str(cell)+":" + str(unique_action) + \
                        " ("+str(ratio)[0:5]+"%)\n"
                    virtual_patient.append(Event(unique_action, cell, ratio))
    if func_action == "represent":
        return final_rep
    return virtual_patient


def compare_cohort_pair(cohort1_query, cohort2_query, density_threshold, action="score"):
    virutal_trajectory1 = represent_cohort(
        cohort1_query, density_threshold, "virtual")
    virutal_trajectory2 = represent_cohort(
        cohort2_query, density_threshold, "virtual")
    if virutal_trajectory1 == -1 or virutal_trajectory2 == -1:
        return -1  # either cohorts are small (less tahn 50 members)
    longest_trajectory = virutal_trajectory1[-1].month
    if virutal_trajectory2[-1].month > longest_trajectory:
        longest_trajectory = virutal_trajectory2[-1].month
    start_time = time.time()
    match_score, match_matrix = sequence_matching.compute_needleman_wunsch(
        virutal_trajectory1, virutal_trajectory2, "score_seq")
    end_time = time.time()
    time_length = end_time - start_time
    logging.info("matched trajectories in "+str(time_length)+" seconds.")
    if action == "score":
        return float(str(match_score)[0:4])
    # make behavior matrix
    cohort_behavior = initialize_cohort_behavior(longest_trajectory)
    cohort_action_names = []
    match_matrix_actions = match_matrix.split(" ")
    for match_matrix_action in match_matrix_actions:
        if match_matrix_action != "" and match_matrix_action != None:
            parts = match_matrix_action[1:-1].split(",")
            event_month1 = parts[1]
            event_month2 = parts[3]
            event_name = parts[0]
            which_cell = abs(int(event_month1)+int(event_month2))/2
            how_good = float(longest_trajectory - abs(int(event_month1) -
                                                      int(event_month2))) / float(longest_trajectory) * 100.0
            new_behavior = CohortEvent(event_name, how_good)
            cohort_behavior[which_cell].append(new_behavior)
    # maximum number of times an action is repeated in the cohort.
    max_frequency = 1
    final_rep = ""
    virtual_patient = []
    for cell in cohort_behavior:
        if len(cohort_behavior[cell]) != 0:
            for action in cohort_behavior[cell]:
                if action.confidence >= density_threshold:
                    final_rep += "t"+str(cell)+":" + str(action) + \
                        " ("+str(action.confidence)[0:5]+"%)\n"
                    virtual_patient.append(
                        Event(action.name, cell, action.confidence))
    if action == "represent":
        return final_rep
    return virtual_patient
