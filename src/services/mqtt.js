import mqtt from 'mqtt'
import { ref } from 'vue'
import axios from 'axios'

class MQTTService {
    constructor() {
        this.client = null
        this.connected = ref(false)
        this.clients = ref([])
        this.clientsMap = new Map() // For faster lookups
    }

    connect() {
        const brokerUrl = 'ws://localhost:9001'
        console.log('Attempting to connect to MQTT broker:', brokerUrl)
        
        const options = {
            keepalive: 60,
            clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
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
                
                // Subscribe to client topics with wildcard
                const clientTopic = 'TimeKeeper/wfm/clients/#'  // Changed to catch all client messages
                
                this.client.subscribe(clientTopic, (err) => {
                    if (err) {
                        console.error('Error subscribing to topics:', err)
                    } else {
                        console.log('Subscribed to:', clientTopic)
                    }
                })
            })

            this.client.on('error', (err) => {
                console.error('MQTT connection error:', err)
                this.connected.value = false
            })

            this.client.on('close', () => {
                console.log('MQTT connection closed')
                this.connected.value = false
            })

            this.client.on('message', (topic, message) => {
                console.log('Received message on topic:', topic)
                console.log('Message content:', message.toString())
                
                const segments = topic.split('/')
                const clientName = segments[3]
                const messageType = segments[4]

                try {
                    const data = JSON.parse(message.toString())
                    console.log('Parsed client data:', data)
                    
                    if (messageType === 'details') {
                        console.log('Updating client details for:', clientName)
                        this.updateClientDetails(clientName, data)
                        console.log('Current clients:', this.clients.value)
                    } else if (messageType === 'status') {
                        console.log('Updating client status for:', clientName)
                        this.updateClientStatus(clientName, data)
                    }
                } catch (e) {
                    console.error('Error processing MQTT message:', e)
                }
            })
        } catch (err) {
            console.error('Failed to connect to MQTT broker:', err)
            this.connected.value = false
        }
    }

    updateClientDetails(clientName, details) {
        console.log('updateClientDetails called with:', { clientName, details })
        
        // First try to find by UUID
        let existingIndex = this.clients.value.findIndex(c => c.uuid === details.uuid)
        
        // If not found by UUID, try to find by name
        if (existingIndex === -1) {
            existingIndex = this.clients.value.findIndex(c => 
                this.sanitizeTopicName(c.name) === this.sanitizeTopicName(clientName)
            )
        }
        
        console.log('Existing client index:', existingIndex)
        
        if (existingIndex >= 0) {
            console.log('Updating existing client')
            // Preserve existing fields that aren't in the update
            this.clients.value[existingIndex] = {
                ...this.clients.value[existingIndex],  // Keep existing data
                ...details,                            // Apply updates
                status: this.clients.value[existingIndex].status // Preserve status
            }
            console.log('Updated client:', this.clients.value[existingIndex])
        } else {
            console.log('Adding new client')
            this.clients.value.push({
                ...details,
                status: 'active'
            })
        }
        
        console.log('Updated clients array:', this.clients.value)
        
        // Update map for faster lookups
        this.clientsMap.set(details.uuid, details)
    }

    updateClientStatus(clientName, statusData) {
        const client = this.clients.value.find(c => 
            this.sanitizeTopicName(c.name) === clientName
        )
        
        if (client) {
            client.status = statusData.status
        }
    }

    sanitizeTopicName(name) {
        if (!name) return 'unknown'
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
    }

    disconnect() {
        if (this.client) {
            this.client.end()
            this.connected.value = false
        }
    }

    async updateClient(clientId, updates) {
        try {
            // Find the current client data
            const client = this.clients.value.find(c => c.uuid === clientId)
            if (!client) {
                throw new Error('Client not found')
            }

            // Create complete updated client data
            const updatedClient = {
                ...client,           // Include all existing client data
                ...updates,          // Apply the updates
                uuid: client.uuid    // Ensure UUID remains unchanged
            }

            // Publish complete client data to MQTT topic
            const topic = `TimeKeeper/wfm/clients/${clientId}/details`
            console.log('Publishing complete update to:', topic, updatedClient)
            
            this.client.publish(topic, JSON.stringify(updatedClient))
            return true
        } catch (error) {
            console.error('Error publishing client update:', error)
            throw error
        }
    }
}

export const mqttService = new MQTTService() 