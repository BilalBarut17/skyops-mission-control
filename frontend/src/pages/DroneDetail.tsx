import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Drone {
  id: string;
  serialNumber: string;
  model: string;
  status: string;
  totalFlightHours: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDueDate: string | null;
  registrationTimestamp: string;
}

interface Mission {
  id: string;
  name: string;
  status: string;
  missionType: string;
  plannedStart: string;
  plannedEnd: string;
  flightHoursLogged: number | null;
}

interface MaintenanceLog {
  id: string;
  type: string;
  technicianName: string;
  datePerformed: string;
  flightHoursAtMaintenance: number;
  notes: string | null;
}

export default function DroneDetail() {
  const { id } = useParams<{ id: string }>();
  const [drone, setDrone] = useState<Drone | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`${API_BASE}/drones/${id}`).then((r) => r.json()),
      fetch(`${API_BASE}/missions?droneId=${id}&page=1&limit=20`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/maintenance-logs/drone/${id}`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([droneData, missionsResponse, maintenanceResponse]) => {
        setDrone(droneData);
        setMissions(missionsResponse.data || []);
        setMaintenanceLogs(Array.isArray(maintenanceResponse) ? maintenanceResponse : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!drone) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-600">Drone not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6">
        <Link to="/" className="text-indigo-600 hover:text-indigo-900">
          ← Back to Dashboard
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {drone.serialNumber}
        </h1>
        <p className="text-gray-600 mt-1">{drone.model}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Drone Information
        </h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    drone.status === 'AVAILABLE'
                      ? 'bg-green-100 text-green-800'
                      : drone.status === 'IN_MISSION'
                        ? 'bg-blue-100 text-blue-800'
                        : drone.status === 'MAINTENANCE'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {drone.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Total Flight Hours
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {drone.totalFlightHours.toFixed(1)}h
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Maintenance
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {drone.lastMaintenanceDate
                  ? new Date(drone.lastMaintenanceDate).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Next Maintenance Due
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {drone.nextMaintenanceDueDate
                  ? new Date(drone.nextMaintenanceDueDate).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Registration Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(drone.registrationTimestamp).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Mission History
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {missions.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">
              No missions recorded
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mission Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Planned Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flight Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mission.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mission.missionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mission.status === 'PLANNED'
                            ? 'bg-gray-100 text-gray-800'
                            : mission.status === 'PRE_FLIGHT_CHECK'
                              ? 'bg-yellow-100 text-yellow-800'
                              : mission.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : mission.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {mission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mission.plannedStart).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mission.flightHoursLogged != null
                        ? `${mission.flightHoursLogged.toFixed(1)}h`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Maintenance History
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {maintenanceLogs.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">
              No maintenance logs recorded
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Performed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flight Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.datePerformed).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.technicianName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.flightHoursAtMaintenance.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
