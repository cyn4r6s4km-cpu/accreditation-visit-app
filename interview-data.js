'use strict';

// GP interview and exit interview (primary surveyor). Mirrors sections 7 and 8 of
// AccreditationPro_Standard_Comments_Reference.md — the master document wins,
// so change wording there first, then here.
//
// [Name] is replaced with the interviewed doctor's name. [square brackets] are
// placeholders; {a / b} means pick one. Annotation types: c = Commendation,
// io = Improvement Opportunity, ra = Required Action.

const GP_INTERVIEW = [
  {
    code: 'C1.3B', title: 'Information to Support Patient Care',
    ask: ['How do patients receive information to support the management of their condition?'],
    cover: 'Treatment options, risks and side effects discussed and documented; refusal of advice documented; information sheets.',
    standards: [{ text: 'When interviewed, [Name] confirmed that patients receive information to support the diagnosis, treatment and management of their conditions. Treatment options, risks and side effects are discussed with patients and documented in the health record, along with any refusal of advice. Patients are given [patient information sheets] where relevant.' }],
    notes: [
      { type: 'io', trigger: 'no culturally specific information', text: 'Consider making culturally specific health information (e.g. Aboriginal and Torres Strait Islander health) available in the waiting room and consultation rooms.' },
      { type: 'ra', trigger: 'discussions not documented', text: 'The practice must document in the patient’s health record the treatment options, risks and side effects discussed with the patient, and any refusal to follow advice.' }
    ]
  },
  {
    code: 'C1.4A', title: 'Interpreter Services',
    ask: ['Do you use interpreters for patients who do not speak the primary language of your practice team?'],
    cover: 'Interpreters used (TIS National); translation services documented in the health record.',
    standards: [{ text: '[Name] confirmed that interpreters are used for patients who do not speak the primary language of the practice team, through [TIS National], and details of any translation services used are documented in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'not all practitioners registered', text: 'Consider registering all practitioners with TIS National.' },
      { type: 'ra', trigger: 'not documented', text: 'The practice must document in the patient’s health record details of any translation services used for that patient.' }
    ]
  },
  {
    code: 'C1.4B', title: 'Communication Services',
    ask: ['How do you ensure patients with a communication impairment, such as hearing, speech or vision impairment, disability or cognitive impairment, have appropriate communication services available?'],
    cover: 'Services used (National Relay Service, Auslan); recorded in the health record.',
    standards: [{ text: '[Name] could describe how communication services are used for patients with a communication impairment, including [the National Relay Service and Auslan interpreters]. Details of any communication services used are recorded in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'team unsure how to access', text: 'Consider educating the team on how to contact and use services such as Auslan interpreting for patients who are hearing impaired.' }
    ]
  },
  {
    code: 'C1.5B', title: 'Out-of-Pocket Costs for Referred Services',
    ask: ['How do you let the patient know, when you are making a referral or requesting investigations, that there may be a cost for the service?'],
    cover: 'Patient told there may be a cost (exact cost not needed); provider contact details given.',
    standards: [{ text: '[Name] confirmed that patients are advised when a referral is made or an investigation is requested that there may be a cost for the service{, and are given the provider’s contact details so they can check the cost}.' }],
    notes: [
      { type: 'io', trigger: 'no provider list', text: 'Consider developing a list of local service providers that patients can use to find out about costs and choose their provider.' }
    ]
  },
  {
    code: 'C2.1B', title: 'Refusal of Treatment or Advice',
    ask: ['What is your process when a patient refuses treatment, advice or a procedure?'],
    cover: 'Risks of refusing explained; discussion and decision documented; process in place.',
    standards: [{ text: '[Name] could describe the process when a patient refuses treatment, advice or a procedure. The risks of refusing are explained to the patient, and the discussion and the patient’s decision are documented in the health record.' }],
    notes: [
      { type: 'ra', trigger: 'not documented', text: 'The practice must document in the patient’s health record the risks explained when a patient refuses treatment, advice or a procedure, and have a process outlining what the clinical team must do.' }
    ]
  },
  {
    code: 'C2.1C', title: 'Right to Other Clinical Opinions',
    ask: ['What do you do if a patient wishes to seek another clinical opinion?'],
    cover: 'Decision documented; referral provided where appropriate and documented.',
    standards: [{ text: '[Name] confirmed that patients’ right to seek another clinical opinion is respected. A referral is provided where appropriate, and the patient’s decision and any referral are documented in the health record.' }],
    notes: [
      { type: 'io', trigger: 'no policy', text: 'Consider a policy or procedure explaining how the clinical team manages patients seeking another clinical opinion.' }
    ]
  },
  {
    code: 'C2.1E', title: 'Ethical Dilemmas',
    ask: ['Do you have a system or process for managing ethical dilemmas?', 'Do you document any ethical dilemmas that have been considered, and the outcome or solution?'],
    cover: 'How dilemmas are considered (colleagues, meetings, mentoring); dilemmas and outcomes documented.',
    standards: [{ text: '[Name] could describe how ethical dilemmas are considered, through [discussion with colleagues / clinical team meetings / a mentoring arrangement]. Any ethical dilemmas considered, and the outcome, are documented.' }],
    notes: [
      { type: 'io', trigger: 'informal only', text: 'Consider a policy or procedure explaining how the clinical team manages ethical dilemmas, and discussing them at clinical team meetings.' },
      { type: 'ra', trigger: 'not documented', text: 'The practice must document any ethical dilemmas that have been considered, and the outcome or solution.' }
    ]
  },
  {
    code: 'C2.2A', title: 'Third Party in the Consultation',
    ask: ['What is your process for informing patients when a third party is introduced to the consultation? Is this documented in the patient notes?'],
    cover: 'Prior consent obtained (registrars, students, chaperones); consent documented; identity of chaperone.',
    standards: [{ text: '[Name] confirmed that the patient’s consent is obtained before a third party arranged by the practice, such as [a registrar or medical student], joins the consultation, and this consent is documented in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'no signage when students present', text: 'Consider placing signage in the waiting room when medical or nursing students are at the practice and observing consultations.' },
      { type: 'ra', trigger: 'consent not documented', text: 'The practice must document in the patient’s health record the patient’s consent to the presence of a third party arranged by the practice.' }
    ]
  },
  {
    code: 'C3.4C', title: 'Clinical Team Communication',
    ask: ['How and when do you discuss clinical issues with other practice staff? (Messages from patients, phone calls, emails?)'],
    cover: 'Clinical meetings; informal discussion; internal messaging; team aware of communication processes.',
    standards: [{ text: '[Name] could describe how the clinical team discusses clinical issues and support systems, through [clinical meetings / informal discussions between doctors] and [F8 internal messaging in Best Practice].' }],
    notes: [
      { type: 'io', trigger: 'meetings not recorded', text: 'Consider keeping a record of clinical team meetings.' }
    ]
  },
  {
    code: 'C3.6B', title: 'Consent to Transfer Information for QI',
    ask: ['How do you manage patients’ consent for the transfer of their health information to a third party for quality improvement or professional development activities?'],
    cover: 'Consent obtained before transfer of identified information; documented in the health record.',
    standards: [{ text: '[Name] confirmed that identified patient health information is only transferred to a third party for quality improvement or professional development activities after the patient’s consent has been obtained and documented in the health record.' }],
    notes: [
      { type: 'io', trigger: 'consent not on registration form', text: 'Consider seeking patient consent for the use and transfer of health information on the new patient registration form.' }
    ]
  },
  {
    code: 'C4.1A', title: 'Health Promotion & Preventive Care',
    ask: ['How do your patients receive health promotion, illness prevention and preventive care information? Do you document discussions about this in the health records?'],
    cover: 'Tailored information; brochures, website, reminders for screening; discussions documented.',
    standards: [{ text: '[Name] could describe how patients receive tailored information about health promotion, illness prevention and preventive care, including [brochures and reminders for screening]. Discussions about preventive health are documented in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'no group activities', text: 'Consider running preventive health activities, such as diabetes education or quit smoking groups.' }
    ]
  },
  {
    code: 'C5.1B', title: 'Consistent Diagnosis & Management',
    ask: ['How do you ensure consistent diagnosis and management of your patients?'],
    cover: 'Current evidence-based guidelines available (electronic/hard copy); which ones; discussion between clinicians.',
    standards: [{ text: '[Name] could explain how the clinical team supports consistent diagnosis and management of patients. Current, evidence-based clinical guidelines, including [Therapeutic Guidelines, the RACGP Red Book and HealthPathways], are available to the team{, and patient care is discussed between clinicians}.' }],
    notes: [
      { type: 'io', trigger: 'guideline use not recorded', text: 'Consider keeping records of clinical meetings where the use of clinical guidelines is discussed.' }
    ]
  },
  {
    code: 'C5.2A', title: 'Clinical Autonomy',
    ask: ['Are you given autonomy in relation to the overall clinical care of your patients, referrals to other health professionals, requesting investigations, and the duration and scheduling of appointments?'],
    cover: 'Autonomy over clinical care, referrals, investigations, appointment length and scheduling.',
    standards: [{ text: '[Name] confirmed that they have autonomy over the clinical care of their patients, including referrals to other health professionals, requesting investigations, and the duration and scheduling of appointments.' }],
    notes: [
      { type: 'io', trigger: 'no policy', text: 'Consider a policy stating that practitioners have clinical autonomy to deliver evidence-based care according to their scope of practice, skills and knowledge.' }
    ]
  },
  {
    code: 'C5.3A', title: 'Clinical Handover',
    ask: ['What processes do you have for handover of care in the event of unexpected or expected leave?'],
    cover: 'Handover when on leave (results, patients); referrals with health summary; locums; ambulance transfers.',
    standards: [{ text: '[Name] could describe how patient care is handed over within the practice and to external care providers. When a doctor is on leave, [their results and patients are handed over to a nominated colleague], and referrals are generated from the clinical software with a health summary attached.' }],
    notes: [
      { type: 'io', trigger: 'no written process', text: 'Consider a policy explaining how internal and external handovers, including to locum practitioners, are conducted.' },
      { type: 'ra', trigger: 'no handover process', text: 'The practice must have a process for handover of care in the event of expected or unexpected leave.' }
    ]
  },
  {
    code: 'C6.1A', title: 'Patient Identification',
    ask: ['How do you confirm patients’ identity each time they attend or call the practice?'],
    cover: 'Three approved identifiers at every consultation and when communicating; even when known.',
    standards: [{ text: '[Name] confirmed they always use the three approved patient identifiers at every consultation and when communicating about patients, even when they know the patient well.' }],
    notes: []
  },
  {
    code: 'QI2.2A', title: 'Information About Medicines & Treatments',
    ask: ['How do you inform your patients of the purpose and risks of the medicines and treatments you have prescribed?'],
    cover: 'Purpose, importance, benefits and risks explained; discussions documented.',
    standards: [{ text: '[Name] could describe how patients are informed of the purpose, importance, benefits and risks of their medicines and treatments, through discussion during the consultation{ and consumer medicine information}. These discussions are documented in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'verbal only', text: 'Consider using videos, brochures or posters to inform patients about medicines.' },
      { type: 'ra', trigger: 'not documented', text: 'The practice must keep documentation of discussions about medicines and treatments in the patient’s health record.' }
    ]
  },
  {
    code: 'QI2.2B', title: 'Patient’s Role in Their Treatment',
    ask: ['How do you make your patients aware of their role in their own treatment?'],
    cover: 'Action plans, care plans, CMI; discussions recorded.',
    standards: [{ text: '[Name] could explain how patients are made aware of their role in their own treatment, using [written action plans / care plans / consumer medicine information], and these discussions are recorded in the health record.' }],
    notes: [
      { type: 'io', trigger: 'no written plans', text: 'Consider providing patients with written action plans.' }
    ]
  },
  {
    code: 'QI2.2C', title: 'Medicines Information & Prescribing Patterns',
    ask: ['How do you access current information on medicines?', 'Do you review your prescribing patterns?'],
    cover: 'Sources (AMH, Therapeutic Guidelines, clinical software); how prescribing is reviewed; medicine reviews documented.',
    standards: [{ text: '[Name] could describe how they access current information on medicines, through [the Australian Medicines Handbook / Therapeutic Guidelines / the clinical software], and how prescribing patterns are reviewed{, including [PBS prescribing reports / clinical audits]}. Medicine reviews are documented in the patient’s health record.' }],
    notes: [
      { type: 'io', trigger: 'no prescribing protocols', text: 'Consider practice protocols for areas such as antibiotic prescribing and drugs of dependence.' }
    ]
  },
  {
    code: 'QI2.2E', title: 'Medicines Management',
    ask: ['How do you ensure that medicines are acquired, stored, administered, supplied and disposed of in accordance with relevant laws?', 'ASK: are Schedule 8 medicines held? (Never assume no S8s.)'],
    cover: 'ASK about S8s; storage and register; samples; expiry checks; disposal.',
    standards: [
      { label: 'S8s held', text: '[Name] could explain how medicines, samples and medical consumables are managed in accordance with manufacturers’ directions and relevant laws. Schedule 8 medicines are held on the premises and are stored and recorded in an S8 register in accordance with legislative requirements. Expiry dates are checked [monthly], and expired stock is disposed of appropriately.' },
      { label: 'No S8s', text: '[Name] could explain how medicines, samples and medical consumables are managed in accordance with manufacturers’ directions and relevant laws. No Schedule 8 medicines are held on the premises. Expiry dates are checked [monthly], and expired stock is disposed of appropriately.' }
    ],
    notes: []
  },
  {
    code: 'QI3.1A', title: 'Near Misses & Adverse Events',
    ask: ['How do you identify, monitor and report near misses and adverse events in clinical care?'],
    cover: 'Incident form; register/LOGIQC; who they report to; discussed at meetings; a real example.',
    standards: [{ text: '[Name] could describe how near misses and adverse events are identified, monitored and reported. An incident form is completed and logged in [the incident register / LOGIQC], incidents are reported to [the practice manager], and they are discussed at meetings to drive improvement.' }],
    notes: [
      { type: 'ra', trigger: 'no register', text: 'The practice must implement and maintain an incident or event register.' }
    ]
  },
  {
    code: 'QI3.1B', title: 'Improving Clinical Risk Management',
    ask: ['What improvements to your clinical risk management systems have you made to prevent near misses and adverse events?'],
    cover: 'Specific improvements made; actions recorded on the incident register; revised policies.',
    standards: [{ text: '[Name] could describe improvements made to the practice’s clinical risk management systems to prevent near misses and adverse events, including [example]. Actions taken in response to incidents are recorded in the incident register.' }],
    notes: [
      { type: 'ra', trigger: 'actions not recorded', text: 'The practice must record the actions taken in response to events recorded on the incident or event register.' }
    ]
  },
  {
    code: 'QI3.2B', title: 'Open Disclosure',
    ask: ['Does the practice have and follow an open disclosure process?'],
    cover: 'Open disclosure process based on the Australian Open Disclosure Framework.',
    standards: [{ text: '[Name] confirmed that the practice follows an open disclosure process based on the Australian Open Disclosure Framework.' }],
    notes: []
  },
  {
    code: 'GP1.2A', title: 'Home & Other Visits',
    ask: ['Does the practice offer home and other visits?', 'What do you do if you feel a request for a home visit is not safe and reasonable? Do you document that the conversation has occurred?'],
    cover: 'Visits when safe and reasonable (home, aged care); recorded in health record; alternatives explained when not safe or reasonable, and documented.',
    standards: [
      { label: 'Visits offered', text: '[Name] could explain how patients can access home and other visits when safe and reasonable{, including [residential aged care visits]}. Visits are recorded in the patient’s health record, and when a visit is not safe or reasonable, patients are told how else they can access care.' },
      { label: 'No visits', text: '[Name] confirmed that the practice does not offer home visits. Patients requesting a visit are told how else they can access care, such as [an after-hours home doctor service], and this conversation is documented in the health record.' }
    ],
    notes: [
      { type: 'io', trigger: 'no policy', text: 'Consider a policy explaining the circumstances that make a home or other visit safe and reasonable.' }
    ]
  },
  {
    code: 'GP2.1B', title: 'Continuous & Comprehensive Care',
    ask: ['How does the practice provide comprehensive care to your patients?', 'What type of handover occurs when clinicians are away or on leave?', 'Can you explain your recall process?'],
    cover: 'Continuity of care; handover when away; recall process; management plans for chronic and complex patients.',
    standards: [{ text: '[Name] could describe how the practice provides continuous and comprehensive care. A clinical handover system is used when clinicians are away or on leave, and the practice has a recall process{, with management plans documented for patients with chronic and complex conditions}.' }],
    notes: [
      { type: 'io', trigger: 'no written recall policy', text: 'Consider a policy and procedure for recalls and reminders.' }
    ]
  },
  {
    code: 'GP2.2A', title: 'Review of Results & Correspondence',
    ask: ['What is your process for reviewing and managing results?'],
    cover: 'Results and correspondence (A) reviewed, (B) electronically noted or signed, (C) acted on where required, (D) incorporated into the record; cover for absent doctors.',
    standards: [{ text: '[Name] could describe how pathology results, imaging reports, investigation reports and clinical correspondence are reviewed, electronically noted, acted on where required and incorporated into the patient’s health record. [Results are reviewed daily by the requesting doctor, with results for absent doctors reviewed by a colleague.]' }],
    notes: [
      { type: 'io', trigger: 'process not documented', text: 'Consider a policy or documented procedure for reviewing and managing results.' }
    ]
  },
  {
    code: 'GP2.2B', title: 'Recall of Clinically Significant Results',
    ask: ['What is your process for recalling patients with clinically significant results?'],
    cover: 'Who recalls; how (phone, SMS, letter); each attempt documented.',
    standards: [{ text: '[Name] could explain the process for recalling patients with clinically significant results. [The doctor flags the result for recall and reception contacts the patient], and each attempt to contact the patient is documented in the health record.' }],
    notes: [
      { type: 'ra', trigger: 'attempts not documented', text: 'The practice must document in the patient’s health record each attempt to contact and recall patients about clinically significant results.' }
    ]
  },
  {
    code: 'GP2.2D', title: 'Patient Reminders',
    ask: ['What is your process for initiating and managing reminders?'],
    cover: 'How reminders are generated and sent; who monitors and follows up; responses documented.',
    standards: [{ text: '[Name] could describe how the practice initiates and manages patient reminders, which are generated through [Best Practice] and sent by [SMS / letter]{, with responses documented in the patient’s health record}.' }],
    notes: [
      { type: 'io', trigger: 'responsibility unclear', text: 'Consider documenting the recall and reminder system, including who is responsible for monitoring and follow-up.' }
    ]
  },
  {
    code: 'GP2.2E', title: 'High-Risk Results Outside Normal Hours',
    ask: ['What is your process for managing high-risk results identified outside normal opening hours? Does the diagnostic service have the ability to contact you outside normal opening hours?'],
    cover: 'Labs and imaging hold doctors’ contact numbers; backup contact.',
    standards: [{ text: '[Name] confirmed that pathology laboratories and imaging providers have the doctors’ contact numbers, so seriously abnormal or life-threatening results identified outside normal opening hours can be managed{, with [the practice manager’s] number available as a backup}.' }],
    notes: []
  },
  {
    code: 'GP2.3A', title: 'Collaboration with Other Health Services',
    ask: ['Do you have a register of healthcare service providers and organisations that the practice uses?'],
    cover: 'Directory of local providers (HealthPathways, software address book); collaboration.',
    standards: [{ text: '[Name] confirmed that the practice collaborates with other health services to deliver comprehensive care, and a directory of local healthcare providers and organisations is available{ through [HealthPathways / the clinical software address book]}.' }],
    notes: []
  },
  {
    code: 'GP2.4B', title: 'Practitioner-Initiated Transfer of Care',
    ask: ['What do you do when you want to cease providing care for a patient?'],
    cover: 'Decision and action documented; referral provided; health information transferred on request.',
    standards: [{ text: '[Name] could describe the process when a practitioner decides to cease providing care for a patient. The decision and the action taken are documented in the patient’s health record, and the patient’s health information is transferred to another practitioner on request{, with referrals provided where appropriate}.' }],
    notes: [
      { type: 'io', trigger: 'no policy', text: 'Consider a policy about transferring a patient’s care.' }
    ]
  },
  {
    code: 'GP3.1C', title: 'Equipment Training',
    ask: ['What training in relation to the safe use of practice equipment have you undertaken?'],
    cover: 'Training at commencement and when new equipment arrives; refresher; records.',
    standards: [{ text: '[Name] confirmed they have received training and been shown how to safely use the practice’s clinical equipment{, including when new equipment is introduced}.' }],
    notes: [
      { type: 'io', trigger: 'only at commencement', text: 'Consider providing refresher training in the safe use of clinical equipment, particularly when new equipment is introduced, and maintaining training records.' }
    ]
  },
  {
    code: 'GP3.1D', title: 'Equipment Risks',
    ask: ['What potential risks are associated with the equipment that you use?'],
    cover: 'Awareness of risks (electrical safety, calibration, sharps, sterility) and how they are managed.',
    standards: [{ text: '[Name] could describe the potential risks associated with the equipment they use, including [electrical safety, calibration and sharps injuries], and how these risks are managed.' }],
    notes: []
  },
  {
    code: 'GP4.1D', title: 'Cross Infection Management',
    ask: ['How do you manage the risks of cross infection in the practice? (Hand hygiene; PPE; triage of patients with communicable diseases; disposal of clinical waste and sharps; blood and body fluid spills.)'],
    cover: 'Standard precautions; hand hygiene; PPE; triage/isolation; sharps and clinical waste; spill kits.',
    standards: [{ text: '[Name] could describe how the practice manages the risk of cross infection. Standard precautions are followed, with hand hygiene between patients. Patients with communicable diseases are triaged, offered a mask and isolated if required, and PPE, sharps containers, clinical waste bins and spill kits are available.' }],
    notes: []
  }
];

// Extra prompts from Neil's notes, captured as notes only (no criterion code).
const GP_INTERVIEW_OTHER = ['Clinical guidelines used?', 'Is there a new GP induction?', 'Business risk management?', 'Research?'];

// Exit interview standard wording (section 8). [Practice] is replaced with the practice name.
const EXIT_OPENING = 'Thank you for having us at [Practice]. It is always a privilege to visit other practices and see how other people do things. We acknowledge the considerable hard work that goes into preparing for accreditation, particularly by the practice manager and the principal doctors. You have a great team, and it is clear you are proud of your practice.';
const EXIT_CLOSING = 'Accreditation should be a continuous process rather than something that happens only at the time of a visit, and we encourage the team to keep building on the work done in preparing for today. Thank you again to the whole team for your time, your hospitality and all your hard work.';
