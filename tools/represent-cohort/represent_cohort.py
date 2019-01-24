import psycopg2
import sys
import trajectories
import sequence_matching
import json

# ANALYZE CONFIGURATIONS
with open('config.json') as config_file:
    configs = json.load(config_file)

db_host = ""
db_pwd = ""
db_user = ""
dbname = ""
do_clustering = ""

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
        if s == "clustering":
            do_clustering = configs[config][s]

# ANALYZE INPUT PARAMETERS
density_threshold = 0
if len(sys.argv) < 3:
    print "Error: Cohort identifiers and the density threshold are NOT given."
    print "Please provide cohort identifiers in form a SQL WHERE clause."
    print "Example: Female patients in Grenoble with a density threshold of 0.1 -> \"gender = 'F' and zipcode = '38000'\" 0.1"
    exit(0)
else:
    density_threshold = float(sys.argv[2])
    cohort_identifiers = str(sys.argv[1])
    cohort_identifiers = cohort_identifiers.replace(";", "")

# COHORT QUERY BASED ON CLUSTERING
cohort_query = ""
if do_clustering == "true":
    cohort_query = "select distinct representative from cluster_mapping where k=50 and id_patient in (select id_patient from patients where " + \
        cohort_identifiers+");"
else:
    cohort_query = "select id_patient from patients where "+cohort_identifiers+";"


# DATABASE CONNECTION
conn = psycopg2.connect("dbname='"+dbname+"' user='" +
                        db_user+"' host='"+db_host+"' password='"+db_pwd+"'")
cur = conn.cursor()

# COHORT REPRESENTATION
print trajectories.represent_cohort(cohort_query, density_threshold, "represent")
