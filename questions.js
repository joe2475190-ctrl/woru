// Starter question bank. Each "course" must be an id from data.js and each "topic"
// must match a topic name in data.js EXACTLY. "answer" is the position of the correct
// option, counting from 0 (0 = first option, 1 = second, and so on).
// To add questions: copy one block, give it a new id, and put a comma after the previous "}".

const questions = [
  {
    id: "q1", course: "get201", topic: "Ohm's Law",
    question: "A 12 V battery is connected across a 4 Ω resistor. What current flows?",
    options: ["2 A", "3 A", "4 A", "48 A"], answer: 1,
    explanation: "I = V ÷ R = 12 ÷ 4 = 3 A."
  },
  {
    id: "q2", course: "get201", topic: "Power and Electrical Energy",
    question: "A device draws 2 A at 10 V. What is its power?",
    options: ["5 W", "8 W", "12 W", "20 W"], answer: 3,
    explanation: "P = V × I = 10 × 2 = 20 W."
  },
  {
    id: "q3", course: "get201", topic: "Current, Voltage and Resistance",
    question: "What is the unit of electrical resistance?",
    options: ["Volt", "Ampere", "Ohm", "Watt"], answer: 2,
    explanation: "Resistance is measured in ohms (Ω)."
  },
  {
    id: "q4", course: "get203", topic: "AutoCAD Basics (Commands, Layers, Object Snaps)",
    question: "Which AutoCAD tool makes the cursor snap exactly to the end of an existing line?",
    options: ["Grid", "Ortho", "Endpoint object snap", "Polar tracking"], answer: 2,
    explanation: "The Endpoint object snap locks the cursor onto the exact end of a line or arc."
  },
  {
    id: "q5", course: "get205", topic: "Fluid Statics and Pressure",
    question: "The pressure at depth h in a still fluid of density ρ is given by:",
    options: ["ρgh", "ρ ÷ gh", "gh ÷ ρ", "ρ + g + h"], answer: 0,
    explanation: "Pressure from the fluid column is P = ρgh (add atmospheric pressure for absolute pressure)."
  },
  {
    id: "q6", course: "get207", topic: "Free Body Diagrams",
    question: "What does a free body diagram show?",
    options: ["Only the colour of the object", "All external forces acting on the body", "Only the mass of the body", "The inside structure of the body"], answer: 1,
    explanation: "A free body diagram isolates the body and shows every external force acting on it."
  },
  {
    id: "q7", course: "get209", topic: "Differentiation",
    question: "What is the derivative of x² with respect to x?",
    options: ["x", "2x", "x²", "2"], answer: 1,
    explanation: "Power rule: d/dx (xⁿ) = n·xⁿ⁻¹, so d/dx (x²) = 2x."
  },
  {
    id: "q8", course: "get211", topic: "Lists and Arrays",
    question: "What does len([1, 2, 3]) return in Python?",
    options: ["2", "3", "4", "An error"], answer: 1,
    explanation: "len() counts the items in the list, and there are 3."
  },
  {
    id: "q9", course: "ent211", topic: "Writing a Business Plan",
    question: "Which part of a business plan briefly summarises the whole plan?",
    options: ["Appendix", "Executive summary", "Glossary", "Price table"], answer: 1,
    explanation: "The executive summary gives the key points of the plan in one short section, usually at the start."
  },
    {
    id: "q10", course: "get201", topic: "Resistors in Series and Parallel",
    question: "Three resistors of 2 Ω, 3 Ω and 5 Ω are connected in series. What is the total resistance?",
    options: ["6 Ω", "30 Ω", "0.97 Ω", "10 Ω"], answer: 3,
    explanation: "In series, resistances add: 2 + 3 + 5 = 10 Ω."
  },
  {
    id: "q11", course: "get201", topic: "Resistors in Series and Parallel",
    question: "Two 6 Ω resistors are connected in parallel. What is the total resistance?",
    options: ["12 Ω", "6 Ω", "3 Ω", "1.5 Ω"], answer: 2,
    explanation: "For two equal resistors in parallel, divide one by 2: 6 ÷ 2 = 3 Ω. (Or use (6 × 6) ÷ (6 + 6) = 3 Ω.)"
  },
  {
    id: "q12", course: "get201", topic: "Kirchhoff's Laws",
    question: "Kirchhoff's Current Law says that at any junction:",
    options: ["The current entering equals the current leaving", "The voltage across every branch is equal", "The current is always zero", "The resistance is constant"], answer: 0,
    explanation: "Charge cannot pile up at a junction, so the total current in equals the total current out."
  },
  {
    id: "q13", course: "get201", topic: "Kirchhoff's Laws",
    question: "Kirchhoff's Voltage Law says the algebraic sum of voltages around any closed loop is:",
    options: ["Equal to the current", "Always positive", "Zero", "Equal to the resistance"], answer: 2,
    explanation: "Voltage rises (sources) and drops (resistors) around a closed loop cancel out to zero."
  },
  {
    id: "q14", course: "get201", topic: "Power and Electrical Energy",
    question: "A 100 W bulb is switched on for 5 hours. How much energy does it use?",
    options: ["0.05 kWh", "5 kWh", "500 kWh", "0.5 kWh"], answer: 3,
    explanation: "Energy = power × time = 100 W × 5 h = 500 Wh = 0.5 kWh."
  },
  {
    id: "q15", course: "get201", topic: "Power and Electrical Energy",
    question: "A 3 A current flows through a 10 Ω resistor. What power does it dissipate?",
    options: ["90 W", "30 W", "60 W", "300 W"], answer: 0,
    explanation: "P = I² × R = 3² × 10 = 9 × 10 = 90 W."
  },
  {
    id: "q16", course: "get201", topic: "Capacitors and Inductors",
    question: "What is the unit of capacitance?",
    options: ["Henry", "Weber", "Farad", "Tesla"], answer: 2,
    explanation: "Capacitance is measured in farads (F). The henry is the unit of inductance."
  },
  {
    id: "q17", course: "get201", topic: "Ohm's Law",
    question: "A resistor draws 6 A when 24 V is applied across it. What is its resistance?",
    options: ["4 Ω", "0.25 Ω", "18 Ω", "144 Ω"], answer: 0,
    explanation: "R = V ÷ I = 24 ÷ 6 = 4 Ω."
  },
  {
    id: "q18", course: "get201", topic: "AC Fundamentals (RMS, Phasors)",
    question: "A sinusoidal voltage has a peak value of 10 V. What is its RMS value?",
    options: ["5 V", "10 V", "14.14 V", "7.07 V"], answer: 3,
    explanation: "RMS = peak ÷ √2 = 10 ÷ 1.414 ≈ 7.07 V."
  },
  {
    id: "q19", course: "get201", topic: "Electric Charge and Electric Field",
    question: "Two positive charges are brought close to each other. What happens?",
    options: ["They attract", "They repel", "They cancel out", "Nothing happens"], answer: 1,
    explanation: "Like charges repel each other and opposite charges attract."
  }
];