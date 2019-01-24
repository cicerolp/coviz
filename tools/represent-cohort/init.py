# http://localhost:8888/?threshold=0.1&cohort=gender%20=%20%27F%27%20and%20zipcode%20=%20%2738000%27

import psycopg2
import sys
import trajectories
import sequence_matching
import json

import datetime as dt
import zlib
import base64

import tornado.ioloop
import tornado.web
import os.path
from tornado import template

port = 8888

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

# DATABASE CONNECTION
conn = psycopg2.connect("dbname='"+dbname+"' user='" +
                        db_user+"' host='"+db_host+"' password='"+db_pwd+"'")
cur = conn.cursor()



class DynamicHandlerDensity(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Origin', '*')
        self.set_header('Access-Control-Allow-Headers', '*')
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')



class DynamicHandler(tornado.web.RequestHandler):
    responses = {}
    density_threshold = float('17')

    def cache_response(self, key, response):
        self.responses[key] = {}
        self.responses[key]['response'] = response

    def get_cached_data(self, key):
        if key not in self.responses.keys():
            data = key.split('|')
            response = trajectories.represent_cohort(data[1], float(data[0]), "represent")
            self.cache_response(key, response)
        return self.responses[key]['response']

    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Origin', '*')
        self.set_header('Access-Control-Allow-Headers', '*')
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def options(self):
        # no body
        self.set_status(204)
        self.finish()

    def post(self):
        data = base64.b64decode(self.request.body)

        data_cohort = zlib.decompress(data, zlib.MAX_WBITS | 16).split('|')

        cohort_identifiers = data_cohort[1]
        cohort_identifiers = cohort_identifiers.replace(";", "")

        self.density_threshold = data_cohort[0]

        # COHORT QUERY BASED ON CLUSTERING
        cohort_query = ""
        if do_clustering == "true":
            cohort_query = "select distinct representative from cluster_mapping where k=50 and id_patient in (select id_patient from patients where " + \
                cohort_identifiers+");"
        else:
            cohort_query = "select id_patient from patients where "+cohort_identifiers+";"

        # COHORT REPRESENTATION
        self.write(self.get_cached_data(self.density_threshold + "|" + cohort_query))

settings = dict(
    template_path=os.path.join(os.path.dirname(__file__), "templates"),
    static_path="static",
    debug=True
)


application = tornado.web.Application([
    (r"/", DynamicHandler),
    (r"/post", DynamicHandler)
], **settings)


if __name__ == "__main__":
    print("Cohort Server running on port: " + str(port))
    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()
