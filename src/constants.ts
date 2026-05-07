export interface FestivalEvent {
  id: string;
  day: string;
  time: string;
  category: string;
  name: string;
  venue: string;
  description: string;
}

export const INITIAL_CSV_DATA = `Day,Time,Category,Event,Venue,Description
Day 0,04:00pm - 07:00pm,Sports,The Hoop Hustle 2.0,Basketball Court,
Day 0,04:30pm - 07:30pm,Sports,VolleyVibes,Volleyball Court,Trials
Day 0,07:00pm - 09:00pm,Centrals,Under the Stars,Himalayan Lawn,
Day 1,06:00am - 9:00am,Sports,Paradox Champions League,Football Ground,Trials
Day 1,09:30am - 12:00pm,Centrals,Opening Ceremony ,SAC,
Day 1,10:00 AM to 03:00 PM,Technicals,CrashLab: Collegiate Air Crash Investigation Challenge,RJN102,Round 1
Day 1,10:00 AM to 04:00 PM,Technicals,Samvaad 2.0,ICSR Hall 3,Interaction Session
Day 1,10:00 AM to 06:00 PM,Technicals,Python Coding Challenge 5.0,NAC Classrooms,Round 1
Day 1,10:00 AM to 12:00 PM,Technicals,Probably Paradoxical,RJN101,Round 1 - Problem Statement Release
Day 1,10:00 AM to 4:00 PM,Technicals,We Found You Online,NAC Classrooms,Day 1 - Guest Session
Day 1,11:00am - 05:00pm,Sports,IPL Auction Showdown 4.0,Any Classroom,Day 1
Day 1,02:00pm - 06:00pm,Sports,Ranneeti 5.0 BGMI,Any Classroom,
Day 1,03:00pm - 06:00pm,Sports,Paradox Badminton League,Sitara - Badminton Court,Trials
Day 1,03:30PM - 05:00pm,Sports,Last1Standing,Any Classroom,
Day 1,04:00pm - 06:30pm,Culturals,Anubhuti ,RJN 201,
Day 1,04:00pm - 07:00pm,Culturals,D2D,Stall Area Stage,3 stages
Day 1,04:00pm - 08:00pm,Sports,The Hoop Hustle 2.0,Basketball Court,
Day 1,04:30pm - 06:30pm,Culturals,Anime Jeopardy Initial Rounds,CLT,
Day 1,04:30pm - 07:30pm,Sports,VolleyVibes,Volleyball Court,Group Stage
Day 1,05:00pm - 05:30pm,Culturals,Theater Flash Mob ,Himalayan Lawn,
Day 1,07:30pm - 09:30pm,Centrals,Sufi Night/Classical Fusion Artist (tentative) , SAC,
Day 1,09:00 AM to 06:00 PM,Technicals,RoboSoccer 5.0,ICSR Hall 4 (Exhibition Hall),Initial Rounds
Day 1,12:30pm - 03:30pm,Culturals,Capitol Conclave,RMN 103,
Day 1,12:30pm - 03:30pm,Culturals,Youth Parliament,RMN 102,
Day 1,12:30pm - 03:30pm,Culturals,UNWIND - instrumental,Any Classroom,
Day 1,12:30pm - 03:30pm,Culturals,Rants and Riffs,RJN 102,
Day 2,02:00pm - 05:00pm,Culturals,Comedy,CLT(tentative),
Day 2,02:00pm - 05:00pm,Sports,Ranneeti 5.0 Pocket Arcade,Any Classroom,
Day 2,02:00pm - 08:00pm,Sports,Ranneeti 5.0 BGMI,Any Classroom,
Day 2,03:30pm - 07:00pm,Sports,Squid Games,Sangam Ground/ KV ground,
Day 2,04:00pm - 07:00pm,Sports,The Hoop Hustle 2.0,Basketball Court,
Day 2,04:30pm - 07:30pm,Sports,Paradox Champions League,Football Ground,Finals
Day 2,05:00am - 06:00am,Sports,The Burn Club,Any Classroom,
Day 2,05:00am - 08:00am,Sports,Kampus Run,IITM Campus,Sports
Day 2,05:00pm - 06:00pm,Culturals,Theatre nukkad,Outside SAC/CLT,
Day 2,05:00pm - 07:00pm,Sports,VolleyVibes,Volleyball Court,Group Stage
Day 2,07:00pm - 09:00pm ,Centrals,DJ Night ,OAT,(entry starts at 6PM) 
Day 2,09:00 AM to 06:00 PM,Technicals,RoboSoccer 5.0,ICSR Hall 4 (Exhibition Hall),Semi-finals and Final Rounds
Day 2,09:00am - 11:00am,Sports,Squid Games,Any Classroom,
Day 2,10:00 AM to 03:00 PM,Technicals,Circuit Design Competition 2.0,RJN101,First Round (Simulation)
Day 2,10:00 AM to 03:00 PM,Technicals,DSA Triathlon 3.0,NAC Classrooms,Initial Round
Day 2,10:00 AM to 04:00 PM,Technicals,Probably Paradoxical,RJN102,Round 1 invigilation
Day 2,10:00 AM to 04:00 PM,Technicals,Research: To Infinity & Beyond,NAC Classrooms,Competition
Day 2,10:00 AM to 06:00 PM,Technicals,CrashLab: Collegiate Air Crash Investigation Challenge,ICSR Hall 2,Final Round (Day 2)
Day 2,10:00 AM to 06:00 PM,Technicals,Manch of Traders,ICSR Hall 3,On-campus Finals
Day 2,10:00 AM to 06:00 PM,Technicals,Python Coding Challenge 5.0,NAC Classrooms,Round 2 & Final Round
Day 2,10:00 AM to 4:00 PM,Technicals,We Found You Online,NAC Classrooms,Day 2 - Round progression
Day 2,10:00am - 02:00pm,Sports,Paradox Badminton League,Sitara - Badminton Court,Group Stage
Day 2,10:00am - 11:30am ,Culturals,Qutopia,CLT,
Day 2,11:00am - 01:00pm,Sports,Last1Standing,Any Classroom,
Day 2,11:00am - 05:00pm,Sports,IPL Auction Showdown 4.0,Any Hall/Classroom,Day 2 (Final)
Day 2,11:30am - 02:00pm,Culturals,Unwind - Vocal,Any Classroom,
Day 2,12:00pm - 02:00pm,Culturals,Pictionary Art Relay,Any Classroom,
Day 2,12:30pm - 03:30pm,Culturals,Anime Jeopardy Final Rounds,Any Classroom,
Day 3,02:00 PM to 06:00 PM,Technicals,Research: To Infinity & Beyond,ICSR Hall 3,Guest Session
Day 3,02:00pm - 05:00pm,Sports,Ranneeti 5.0 Pocket Arcade,Any Classroom,
Day 3,02:30pm - 03:00pm,Culturals,Theatre nukkad,Outside SAC/CLT,
Day 3,03:00pm - 5:00 pm,Culturals,Aur Karo Theater,SAC/CLT,
Day 3,05:00pm - 06:30pm,Centrals,Comedy Show (tentative) ,SAC,
Day 3,05:00pm - 06:30pm,Sports,VolleyVibes,Volleyball Court,Finals
Day 3,05:00pm - 06:30pm,Sports,The Hoop Hustle 2.0,Basketball Court,
Day 3,05:00pm - 07:00pm,Culturals,D2D, Himalayan Lawn,
Day 3,07:00am - 09:00am,Sports,Paradox Champions League,Football Ground,Semi-Finals
Day 3,09:00 AM to 06:00 PM,Technicals,RoboSoccer 5.0,ICSR Hall 4 (Exhibition Hall),Final Round (ext) + Free Play
Day 3,10:00 AM to 03:00 PM,Technicals,Circuit Design Competition 2.0,New IE Lab,Final Round (Hardware Demo)
Day 3,10:00 AM to 03:00 PM,Technicals,DSA Triathlon 3.0,ICSR Hall 2,Final Round
Day 3,10:00 AM to 04:00 PM,Technicals,Probably Paradoxical,RJN102,Final Round
Day 3,10:00 AM to 04:00 PM,Technicals,Final Lap: Formula Racing,CLT Lobby,Round progression
Day 3,10:00 AM to 04:00 PM,Technicals,GadgetXpo 2.0,RJN 201,On-campus Finals
Day 3,10:00 AM to 04:00 PM,Technicals,RopeWalker,ESB Lobby,Round progression
Day 3,10:00 AM to 06:00 PM,Technicals,Echo//Prometheus,IITM Campus Zones,Investigation Rounds
Day 3,10:00 AM to 4:00 PM,Technicals,We Found You Online,NAC Classrooms,Day 3 - Round progression
Day 3,10:00am - 12:00pm,Culturals,Capitol Conclave,RJN 102,
Day 3,10:00am - 12:00pm,Culturals,Youth Parliement Finale,RJN 101,
Day 3,10:00am - 12:00pm,Sports,Paradox Badminton League,Football Ground,Semi-Finals
Day 3,10:30am - 01:30pm,Culturals,Paradox Got Talent Finale,Any Classroom,
Day 3,11:00am - 12:30pm,Sports,Last1Standing,Any Classroom,
Day 3,12:30pm - 03:00pm,Culturals,Qutopia Finale,Any Classroom,
Day 3,12:30PM - 03:00PM,Culturals,Anubhuti Finale,RJN 201,
Day 3,7PM ONWARDS,Culturals,PARDOX UNWIND ,OAT ,
Day 4,01:30pm - 04:00pm,Culturals,Mr&Ms Paradox(Interchangable),SAC,
Day 4,04:30pm - 07:00 pm,Culturals,D2D(Interchangable),SAC,
Day 4,05:00 PM to 06:00 PM,Technicals,Chromatix,SAC,10 min show before D2D finals
Day 4,07:00am - 09:00am,Sports,Paradox Champions League,Football Ground,Finals
Day 4,07:00pm - 09:00pm,Culturals,Rapadox,Himalayan Lawn,
Day 4,10:00 AM to 12:00 PM,Technicals,Echo//Prometheus,IITM Campus Zones,Finals
Day 4,10:00 AM to 4:00 PM,Technicals,We Found You Online,NAC Classrooms,Day 4 - Finals
Day 4,10:00am - 01:00pm,Culturals,Literary Leisure, RJN 102,
Day 4,10:00am - 11:30pm,Sports,Last1Standing,Volleyball Court,Semi-Finals
Day 4,10:00am - 12:00pm,Sports,Paradox Badminton League,Sitara - Badminton Court,Finals
Day 4,11:00am - 12:00pm,Culturals,Paradox Got Talent Finale,CLT ,
Day 4,11:30am - 01:00pm,Culturals,Shutter safari, RJN 201,
Day 5 ,02:00pm - 04:00pm,Centrals,Closing Ceremony  ,SAC,`;
