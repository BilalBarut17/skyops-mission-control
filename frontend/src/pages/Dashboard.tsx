import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface FleetHealth {
  totalDrones: number;
  dronesByStatus: Record<string, number>;
  overdueMaintenanceDrones: Array<{
    id: string;
    serialNumber: string;
    status: string;
  }>;
  missionsInNext24Hours: number;
  averageFlightHoursPerDrone: number;
}

interface Drone {
  id: string;
  serialNumber: string;
  model: string;
  status: string;
  totalFlightHours: number;
  nextMaintenanceDueDate: string | null;
}

interface Mission {
  id: string;
  name: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  drone: {
    serialNumber: string;
  };
}

export default function Dashboard() {
  const [fleetHealth, setFleetHealth] = useState<FleetHealth | null>(null);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/fleet-health`).then((r) => r.json()),
      fetch(`${API_BASE}/drones?page=1&limit=10`).then((r) => r.json()),
      fetch(`${API_BASE}/missions?page=1&limit=10`).then((r) => r.json()),
    ])
      .then(([health, dronesResponse, missionsResponse]) => {
        setFleetHealth(health);
        setDrones(dronesResponse.data || []);
        setMissions(missionsResponse.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          SkyOps Mission Control
        </h1>
        <p className="text-gray-600 mt-1">
          Drone Fleet Management Dashboard
        </p>
      </header>

      {fleetHealth && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Fleet Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Drones</p>
              <p className="text-3xl font-bold text-gray-900">
                {fleetHealth.totalDrones}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-3xl font-bold text-green-600">
                {fleetHealth.dronesByStatus?.AVAILABLE || 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">In Mission</p>
              <p className="text-3xl font-bold text-blue-600">
                {fleetHealth.dronesByStatus?.IN_MISSION || 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">Maintenance</p>
              <p className="text-3xl font-bold text-orange-600">
                {fleetHealth.dronesByStatus?.MAINTENANCE || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">
                Missions in Next 24 Hours
              </p>
              <p className="text-3xl font-bold text-indigo-600">
                {fleetHealth.missionsInNext24Hours}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-500">
                Avg Flight Hours per Drone
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {fleetHealth.averageFlightHoursPerDrone.toFixed(1)}h
              </p>
            </div>
          </div>

          {fleetHealth.overdueMaintenanceDrones.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h3 className="text-red-800 font-semibold mb-2">
                ⚠️ Maintenance Alerts ({fleetHealth.overdueMaintenanceDrones.length})
              </h3>
              <ul className="space-y-1">
                {fleetHealth.overdueMaintenanceDrones.slice(0, 5).map((d) => (
                  <li key={d.id} className="text-sm text-red-700">
                    {d.serialNumber} - {d.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Drone Fleet
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flight Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Maintenance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drones.map((drone) => (
                <tr key={drone.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {drone.serialNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drone.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drone.totalFlightHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drone.nextMaintenanceDueDate
                      ? new Date(
                          drone.nextMaintenanceDueDate,
                        ).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      to={`/drones/${drone.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Mission View
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mission Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Planned Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Planned End
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
                    {mission.drone?.serialNumber || 'N/A'}
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
                    {new Date(mission.plannedEnd).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
