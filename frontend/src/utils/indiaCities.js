// India States and Districts/Cities data for KisanMitra registration form

const INDIA_STATES_CITIES = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool',
    'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur',
    'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam',
    'Adoni', 'Tenali', 'Chittoor', 'Hindupur', 'Bhimavaram',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Namsai', 'Bomdila',
    'Tawang', 'Ziro', 'Along', 'Tezu', 'Changlang',
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon',
    'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu',
    'Goalpara', 'Sivasagar', 'Lakhimpur', 'Karimganj', 'Hailakandi',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia',
    'Darbhanga', 'Arrah', 'Begusarai', 'Katihar', 'Munger',
    'Chhapra', 'Bettiah', 'Saharsa', 'Sasaram', 'Hajipur',
    'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bagaha',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg',
    'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Mahasamund',
    'Dhamtari', 'Chirmiri', 'Bhatapara', 'Kanker', 'Kondagaon',
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda',
    'Bicholim', 'Curchorem', 'Sanquelim', 'Quepem', 'Sanguem',
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar',
    'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari',
    'Morbi', 'Mehsana', 'Surendranagar', 'Bharuch', 'Porbandar',
    'Amreli', 'Nadiad', 'Godhra', 'Botad', 'Palanpur',
  ],
  'Haryana': [
    'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar',
    'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula',
    'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar',
    'Kaithal', 'Rewari', 'Palwal', 'Narnaul', 'Fatehabad',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Palampur',
    'Baddi', 'Nahan', 'Kullu', 'Hamirpur', 'Una',
    'Bilaspur', 'Chamba', 'Kangra', 'Keylong', 'Recong Peo',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar',
    'Phusro', 'Hazaribag', 'Giridih', 'Ramgarh', 'Medininagar',
    'Chirkunda', 'Chaibasa', 'Dumka', 'Gumla', 'Lohardaga',
  ],
  'Karnataka': [
    'Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum',
    'Gulbarga', 'Davanagere', 'Bellary', 'Shimoga', 'Tumkur',
    'Raichur', 'Bijapur', 'Udupi', 'Hassan', 'Dharwad',
    'Hospet', 'Gadag', 'Bagalkot', 'Koppal', 'Mandya',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur',
    'Alappuzha', 'Palakkad', 'Malappuram', 'Kottayam', 'Kannur',
    'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad', 'Ernakulam',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain',
    'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa',
    'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind',
    'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad',
    'Solapur', 'Amravati', 'Kolhapur', 'Thane', 'Latur',
    'Nanded', 'Jalgaon', 'Akola', 'Chandrapur', 'Parbhani',
    'Sangli', 'Satara', 'Osmanabad', 'Ahmednagar', 'Dhule',
  ],
  'Manipur': [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul',
    'Senapati', 'Tamenglong', 'Chandel', 'Jiribam', 'Kakching',
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Baghmara',
    'Cherrapunjee', 'Williamnagar', 'Resubelpara', 'Ampati', 'Mawkyrwat',
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib',
    'Saiha', 'Lawngtlai', 'Mamit', 'Hnahthial', 'Saitual',
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha',
    'Mon', 'Zunheboto', 'Phek', 'Kiphire', 'Longleng',
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda',
    'Bargarh', 'Angul', 'Dhenkanal', 'Keonjhar', 'Rayagada',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
    'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga',
    'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar',
    'Barnala', 'Rajpura', 'Firozpur', 'Kapurthala', 'Gurdaspur',
    'Sangrur', 'Ropar', 'Fatehgarh Sahib', 'Nawanshahr', 'Mansa',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer',
    'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar',
    'Sri Ganganagar', 'Pali', 'Tonk', 'Barmer', 'Kishangarh',
    'Beawar', 'Hanumangarh', 'Dhaulpur', 'Sriganganagar', 'Chittorgarh',
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Ravangla',
    'Jorethang', 'Singtam', 'Rangpo', 'Pakyong', 'Soreng',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur',
    'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumarapalayam',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam',
    'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet',
    'Miryalaguda', 'Siddipet', 'Bodhan', 'Mancherial', 'Kothagudem',
  ],
  'Tripura': [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia',
    'Ambassa', 'Khowai', 'Sabroom', 'Sonamura', 'Bishalgarh',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi',
    'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad',
    'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi',
    'Muzaffarnagar', 'Mathura', 'Rampur', 'Shahjahanpur', 'Farrukhabad',
    'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur',
    'Kashipur', 'Rishikesh', 'Pithoragarh', 'Almora', 'Nainital',
    'Ramnagar', 'Mussoorie', 'Tehri', 'Champawat', 'Bageshwar',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur',
    'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur',
    'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia',
    'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri',
  ],

  // Union Territories
  'Delhi': [
    'New Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Pitampura',
    'Laxmi Nagar', 'Shahdara', 'Uttam Nagar', 'Vikaspuri', 'Narela',
    'Najafgarh', 'Karol Bagh', 'Patel Nagar', 'Saket', 'Vasant Kunj',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Sopore', 'Baramulla',
    'Bandipore', 'Kathua', 'Udhampur', 'Rajauri', 'Poonch',
  ],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Padum', 'Zanskar'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Kalpeni'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat', 'Mayabunder', 'Car Nicobar'],
};

export const STATES = Object.keys(INDIA_STATES_CITIES).sort();

export function getCitiesForState(state) {
  return INDIA_STATES_CITIES[state] || [];
}

export default INDIA_STATES_CITIES;
