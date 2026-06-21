// Major UK bus & coach stations for the Buses picker.
//
// Live data is TransportAPI (via the Worker proxy), keyed by a NaPTAN ATCO code.
// Bus stations have many stances and TransportAPI is per-stop, so an `atco` here
// is a best-effort representative stance — verify/override in Settings (find a
// stop's code on https://bustimes.org). Stations without a code yet are still
// selectable; paste the ATCO to go live. Edinburgh has the built-in demo board.
export const BUS_STATIONS = [
  { id: 'edinburgh', name: 'Edinburgh Bus Station', city: 'Edinburgh', atco: '' },
  { id: 'glasgow-buchanan', name: 'Glasgow Buchanan Bus Station', city: 'Glasgow', atco: '60903826' },
  { id: 'aberdeen-union-square', name: 'Aberdeen Union Square Bus Station', city: 'Aberdeen', atco: '639070021' },
  { id: 'dundee-seagate', name: 'Dundee Seagate Bus Station', city: 'Dundee', atco: '640012256' },
  { id: 'inverness', name: 'Inverness Bus Station', city: 'Inverness', atco: '' },
  { id: 'london-vcs', name: 'London Victoria Coach Station', city: 'London', atco: '' },
  { id: 'birmingham-digbeth', name: 'Birmingham Digbeth Coach Station', city: 'Birmingham', atco: '43002103108' },
  { id: 'manchester-central', name: 'Manchester Central Coach Station', city: 'Manchester', atco: '1800CSBS001' },
  { id: 'leeds-city', name: 'Leeds City Bus Station', city: 'Leeds', atco: '450030220' },
  { id: 'newcastle-eldon-square', name: 'Newcastle Eldon Square Bus Station', city: 'Newcastle upon Tyne', atco: '4100008ELDAS' },
  { id: 'nottingham-broadmarsh', name: 'Nottingham Broad Marsh Bus Station', city: 'Nottingham', atco: '3390BB10' },
  { id: 'liverpool-one', name: 'Liverpool ONE Bus Station', city: 'Liverpool', atco: '' },
  { id: 'sheffield-interchange', name: 'Sheffield Interchange', city: 'Sheffield', atco: '' },
  { id: 'bristol', name: 'Bristol Bus Station', city: 'Bristol', atco: '' },
  { id: 'cardiff', name: 'Cardiff Central Bus Station', city: 'Cardiff', atco: '' },
  { id: 'swansea', name: 'Swansea Bus Station', city: 'Swansea', atco: '' },
  { id: 'leicester', name: "Leicester St Margaret's Bus Station", city: 'Leicester', atco: '' },
  { id: 'coventry', name: 'Coventry Pool Meadow Bus Station', city: 'Coventry', atco: '' },
  { id: 'wolverhampton', name: 'Wolverhampton Bus Station', city: 'Wolverhampton', atco: '' },
  { id: 'derby', name: 'Derby Bus Station', city: 'Derby', atco: '' },
  { id: 'hull', name: 'Hull Paragon Interchange', city: 'Hull', atco: '' },
  { id: 'preston', name: 'Preston Bus Station', city: 'Preston', atco: '' },
  { id: 'bradford', name: 'Bradford Interchange', city: 'Bradford', atco: '' },
  { id: 'oxford', name: 'Oxford Gloucester Green', city: 'Oxford', atco: '' },
  { id: 'cambridge', name: 'Cambridge Drummer Street', city: 'Cambridge', atco: '' },
  { id: 'brighton', name: 'Brighton Pool Valley', city: 'Brighton', atco: '' },
  { id: 'southampton', name: 'Southampton Coach Station', city: 'Southampton', atco: '' },
  { id: 'plymouth', name: 'Plymouth Bretonside', city: 'Plymouth', atco: '' },
  { id: 'exeter', name: 'Exeter Bus Station', city: 'Exeter', atco: '' },
  { id: 'norwich', name: 'Norwich Bus Station', city: 'Norwich', atco: '' },
];
