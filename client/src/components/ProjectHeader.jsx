import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProjectHeader({ projectId }) {
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const [projRes, teamRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/team-members/${projectId}`),
        ]);

        setProject(projRes.data);
        setTeamMembers(teamRes.data);
      } catch (error) {
        console.error("Failed to fetch project data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-400 to-slate-500 h-48 animate-pulse" />
    );
  }

  if (!project) {
    return <div className="text-red-500">Unable to load project</div>;
  }

  return (
    <header className={`bg-gradient-to-r ${project.accent || "from-blue-500 to-blue-600"} text-white px-6 py-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Project Info Row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
            <div className="space-y-1 text-sm text-white/90">
              <p>🧑‍🏫 Mentor: {project.mentor}</p>
              <p>🏫 Department: {project.department}</p>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="text-right min-w-48">
            <div className="text-5xl font-bold">{project.progress}%</div>
            <p className="text-sm text-white/80 mb-3">Project Completion</p>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-3 bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Team Members Section */}
        <div className="border-t border-white/20 pt-4">
          <p className="text-sm font-semibold text-white/80 mb-3">👥 TEAM MEMBERS</p>
          <div className="flex flex-wrap gap-4">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm"
                >
                  {/* Avatar */}
                  <div className="relative">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    {/* Role Badge */}
                    <span className="absolute -bottom-1 -right-1 text-xs bg-white/30 backdrop-blur-sm rounded-full px-1 py-0.5 font-semibold">
                      {member.role === "MENTOR" ? "👨‍🏫" : "👤"}
                    </span>
                  </div>

                  {/* Member Info */}
                  <div className="text-sm">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-white/70">{member.usn}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/70">No team members assigned yet</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
