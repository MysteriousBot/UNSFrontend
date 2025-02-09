import mqtt from 'mqtt'
import { ref, computed } from 'vue'
import { useStore } from 'vuex'

class MQTTJobsService {
    constructor() {
        this.client = null
        this.connected = ref(false)
        this.jobs = ref([])
        this.jobsMap = new Map()
    }

    connect() {
        const brokerUrl = 'ws://localhost:9001'
        console.log('Attempting to connect to MQTT broker for jobs:', brokerUrl)
        
        const options = {
            keepalive: 60,
            clientId: 'mqttjs_jobs_' + Math.random().toString(16).substr(2, 8),
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000
        }

        try {
            this.client = mqtt.connect(brokerUrl, options)

            this.client.on('connect', () => {
                console.log('Connected to MQTT broker successfully')
                this.connected.value = true
                
                // Just subscribe to all jobs
                this.client.subscribe('TimeKeeper/wfm/jobs/#', (err) => {
                    if (err) console.error('Error subscribing to jobs:', err)
                })
            })

            this.client.on('error', (err) => {
                console.error('MQTT connection error:', err)
                this.connected.value = false
            })

            this.client.on('message', (topic, message) => {
                try {
                    const data = JSON.parse(message.toString())
                    this.updateJobDetails(data.uuid, data)
                } catch (e) {
                    console.error('Error processing message:', e)
                }
            })
        } catch (err) {
            console.error('Failed to connect to MQTT broker:', err)
            this.connected.value = false
        }
    }

    updateJobDetails(jobId, details) {
        console.log('updateJobDetails called with:', { jobId, details })
        
        const existingIndex = this.jobs.value.findIndex(j => j.uuid === details.uuid)
        console.log('Existing job index:', existingIndex)
        
        if (existingIndex >= 0) {
            console.log('Updating existing job')
            this.jobs.value[existingIndex] = {
                ...this.jobs.value[existingIndex],
                ...details,
                status: this.jobs.value[existingIndex].status
            }
            console.log('Updated job:', this.jobs.value[existingIndex])
        } else {
            console.log('Adding new job')
            this.jobs.value.push({
                ...details,
                status: 'pending'
            })
        }
        
        // Update map for faster lookups
        this.jobsMap.set(details.uuid, details)
    }

    updateJobStatus(jobId, statusData) {
        const job = this.jobs.value.find(j => j.uuid === jobId)
        if (job) {
            job.status = statusData.status
        }
    }

    async updateJob(jobId, updates) {
        try {
            const job = this.jobs.value.find(j => j.uuid === jobId)
            if (!job) {
                throw new Error('Job not found')
            }

            const updatedJob = {
                ...job,
                ...updates,
                uuid: job.uuid
            }

            const topic = `TimeKeeper/wfm/jobs/${jobId}/details`
            console.log('Publishing job update to:', topic, updatedJob)
            
            this.client.publish(topic, JSON.stringify(updatedJob))
            return true
        } catch (error) {
            console.error('Error publishing job update:', error)
            throw error
        }
    }

    disconnect() {
        if (this.client) {
            this.client.end()
            this.connected.value = false
        }
    }

    // Computed property for My Jobs
    getMyJobs() {
        const store = useStore()
        const staffUuid = store.getters['auth/getUser']?.profile?.staff_uuid?.toLowerCase()
            ?.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
        console.log('Current staff UUID:', staffUuid)

        return computed(() => {
            const filtered = this.jobs.value
                // First filter for jobs where the staff is assigned
                .filter(job => {
                    // Only check job-level records
                    const isJobLevel = job;

                    // Check if staff UUID exists in the assigned_staff array
                    const isAssignedToStaff = job.assigned_staff && 
                                            Array.isArray(job.assigned_staff) &&
                                            job.assigned_staff.some(staff => 
                                                staff.uuid?.toLowerCase() === staffUuid
                                            );

                    return isJobLevel && isAssignedToStaff;
                })
                // Then map to return only the job-level details
                .map(job => ({
                    uuid: job.uuid,
                    job_number: job.job_id,
                    client: job.client,
                    name: job.name,
                    status: job.status,
                    due_date: job.due_date
                }));
            
            console.log('Filtered jobs for staff:', filtered);
            return filtered;
        });
    }

    // Computed property for My Jobs
    getAllJobs() {
        console.log('Returning all jobs')

        return computed(() => {
            const filtered = this.jobs.value
                .filter(job => {
                    // Only include entries that have all required job-level properties
                    return job.uuid && 
                           job.job_id && 
                           job.name &&
                           !job.task_id && // Exclude task-level records
                           !job.staff_id;  // Exclude staff-level records
                })
                .map(job => ({
                    uuid: job.uuid,
                    job_number: job.job_id,
                    client: job.client,
                    name: job.name,
                    status: job.status,
                    due_date: job.due_date
                }));
            
            console.log('All jobs (filtered):', filtered);
            return filtered;
        });
    }
}

export const mqttJobsService = new MQTTJobsService() 