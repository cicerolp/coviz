import trajectories
import time

def determine_direction_needleman_wunsch(c1, c2, c3):
	outstr = ""
	if c1 >= c2 and c1 >= c3:
		outstr += "d"
	if c2 >= c1 and c2 >= c3:
		outstr += "u"
	if c3 >= c2 and c3 >= c1:
		outstr += "l"
	return outstr
def get_longest_trajectory_length(patient1_trajectory,patient2_trajectory):
	out = patient1_trajectory[-1].month
	if patient2_trajectory[-1].month > out:
		out = patient2_trajectory[-1].month
	if out == 0:
		out = 1 # to set the minimal size of a trajectory
	return out
def fill_similarity_matrix(patient1_trajectory, patient2_trajectory, largest_trajectory_length, longest_trajectory_length):
	similarity_matrix = {}
	similarity_direction = {} # 'u' = up, 'l' = left, 'd' = diagonal
	# score initialization - begin
	match_score = longest_trajectory_length
	mismatch_score = -2 * longest_trajectory_length
	indel_score = -10 * longest_trajectory_length
	# score initialization - end
	for i in range(0,largest_trajectory_length+1):
		similarity_matrix[i] = {}
		similarity_direction[i] = {} 
		for j in range(0,largest_trajectory_length+1):
			if i == 0:
				similarity_matrix[i][j] = -1 * j
				similarity_direction[i][j] = "l"
			if j == 0:
				similarity_matrix[i][j] = -1 * i
				similarity_direction[i][j] = "u"
			if i != 0 and j != 0 :
				try:
					event1_name = patient1_trajectory[i-1].name
					event1_month = patient1_trajectory[i-1].month
				except:
					# there is an indel in the first trajectory
					similarity_matrix[i][j] = indel_score
				try:
					event2_name = patient2_trajectory[j-1].name
					event2_month = patient2_trajectory[j-1].month
				except:
					# there is an indel in the second trajectory
					similarity_matrix[i][j] = indel_score
				if event1_name == event2_name:
					# there is a match
					similarity_matrix[i][j] = match_score
				else:
					# there is a mismatch
					similarity_matrix[i][j] = mismatch_score
				choice1 = similarity_matrix[i-1][j-1]
				choice2 = similarity_matrix[i-1][j]
				choice3 = similarity_matrix[i][j-1]
				similarity_matrix[i][j] += -1 * abs(event1_month-event2_month) + max(choice1,choice2,choice3)
				similarity_direction[i][j] = determine_direction_needleman_wunsch(choice1,choice2,choice3)
	return similarity_matrix, similarity_direction
def output_similarity_matrix(patient1_trajectory, patient2_trajectory, largest_trajectory_length, longest_trajectory_length, similarity_matrix, similarity_direction):
	similarity_matrix_out = "\t\t"
	for event in patient2_trajectory:
		similarity_matrix_out += event.name[0:4]+str(event.month)+"\t"
	similarity_matrix_out += "\n"
	for i in range(0,largest_trajectory_length+1):
		if i == 0:
			similarity_matrix_out += "\t"
		else:
			try:
				similarity_matrix_out += patient1_trajectory[i-1].name[0:4]+"_"+":"+str(patient1_trajectory[i-1].month)+"\t"
			except:
				similarity_matrix_out += "GAP\t"
		for j in range(0,largest_trajectory_length):
			similarity_matrix_out += str(similarity_matrix[i][j])+":"+similarity_direction[i][j]+"\t"
		similarity_matrix_out += "\n"
	return similarity_matrix_out
def compute_common_sequence(patient1_trajectory, patient2_trajectory, largest_trajectory_length, longest_trajectory_length, similarity_direction):
	row_cursor = largest_trajectory_length-1 # cursor on the row to navigate the similarity matrix
	col_cursor = largest_trajectory_length-1 # cursor on the column to navigate the similarity matrix
	common_sequence = ""
	sum_scores = 0
	cnt_score = 0.1
	while(row_cursor >= 0 and col_cursor >= 0): # navigating from bottom-right of the similarity matrix to the top-right
		try:
			patient1_name  = patient1_trajectory[col_cursor].name
			patient1_month = str(patient1_trajectory[col_cursor].month)
		except:
			patient1_name  = "GAP"
			patient1_month = str(longest_trajectory_length)
		try:
			patient2_name  = patient2_trajectory[row_cursor].name
			patient2_month = str(patient2_trajectory[row_cursor].month)
		except:
			patient2_name  = "GAP"
			patient2_month = str(longest_trajectory_length)
		match_pair = "("+patient1_name +"," + str(patient1_month)+","+patient2_name + "," + str(patient2_month)+") "
		if longest_trajectory_length == 0:
			local_score = 0
		else:
			local_score = float(longest_trajectory_length - abs(int(patient1_month)-int(patient2_month))) / float(longest_trajectory_length)
		if patient1_name == patient2_name:
			common_sequence = match_pair + common_sequence
			sum_scores += local_score
			cnt_score += 1
		next_direction = similarity_direction[row_cursor][col_cursor]
		if next_direction[0] == "u":
			row_cursor -= 1
		if next_direction[0] == "l":
			col_cursor -= 1
		if next_direction[0] == "d":
			row_cursor -= 1
			col_cursor -= 1
	score = float(str(float(sum_scores) / float(cnt_score))[:4])
	return common_sequence, score

# Possible actions:
# score (default) = returns only a score between 0 and 1, 1 being hihgliy similar
# matrix = returns the similarity matrix
# seq = returns the commmon sequence
# Possible types:
# patients = then the function queries trajectories itself
# trajectories = then the function assumes that trajectories are already queried
def compute_needleman_wunsch(patient1,patient2,action="score"):
	patient1_trajectory = patient1
	patient2_trajectory = patient2
	longest_trajectory_length = get_longest_trajectory_length(patient1_trajectory,patient2_trajectory)
	largest_trajectory_length = len(patient1_trajectory)
	if len(patient2_trajectory) > largest_trajectory_length: # we always keep the first trajectory as the longer one.
		temp = patient2_trajectory
		patient2_trajectory = patient1_trajectory
		patient1_trajectory = temp
		largest_trajectory_length = len(patient1_trajectory)
	similarity_matrix, similarity_direction = fill_similarity_matrix(patient1_trajectory,patient2_trajectory,largest_trajectory_length,longest_trajectory_length)
	if action == "matrix":
		return output_similarity_matrix(patient1_trajectory,patient2_trajectory,largest_trajectory_length, longest_trajectory_length,similarity_matrix,similarity_direction)
	else:
		common_sequence, score = compute_common_sequence(patient1_trajectory, patient2_trajectory, largest_trajectory_length, longest_trajectory_length, similarity_direction)
		if action == "seq":
			return common_sequence
		if action == "score":
			return score
		if action == "score_seq":
			return score,common_sequence

# End of file.