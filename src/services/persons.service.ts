import type { EntityStatus, Person } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import {
  buildPersonSummaries,
  computePersonPackageStats,
  getPackagesForPerson,
} from '@/utils/person-stats'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>

export const personsService = {
  async getAll(): Promise<Person[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getPersons()
  },

  async getById(id: string): Promise<Person | null> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getPersons().find((person) => person.id === id) ?? null
  },

  async getSummaries() {
    await delay()
    storageService.seedIfNeeded()
    const persons = storageService.getPersons()
    const packages = storageService.getPackages()
    return buildPersonSummaries(persons, packages)
  },

  async getPackages(personId: string) {
    await delay()
    storageService.seedIfNeeded()
    const person = storageService.getPersons().find((item) => item.id === personId)
    if (!person) throw new Error('Cliente no encontrado')
    return getPackagesForPerson(person, storageService.getPackages())
  },

  async getReportContext(personId: string) {
    const person = await this.getById(personId)
    if (!person) throw new Error('Cliente no encontrado')
    const packages = await this.getPackages(personId)
    return {
      person,
      packages,
      stats: computePersonPackageStats(packages),
    }
  },

  async create(input: PersonInput): Promise<Person> {
    await delay()
    storageService.seedIfNeeded()
    const now = new Date().toISOString()
    const person: Person = {
      ...input,
      id: createId('per'),
      createdAt: now,
      updatedAt: now,
    }
    storageService.setPersons([person, ...storageService.getPersons()])
    historyService.record({
      action: 'person_created',
      entity: 'person',
      entityId: person.id,
      relatedCode: person.name,
      newStatus: person.status,
      description: `Cliente ${person.name} creado`,
    })
    return person
  },

  async update(id: string, input: Partial<PersonInput>): Promise<Person> {
    await delay()
    const persons = storageService.getPersons()
    const index = persons.findIndex((person) => person.id === id)
    if (index < 0) throw new Error('Cliente no encontrado')
    const current = persons[index]
    if (!current) throw new Error('Cliente no encontrado')

    const updated: Person = {
      ...current,
      ...input,
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    persons[index] = updated
    storageService.setPersons(persons)
    historyService.record({
      action: 'person_updated',
      entity: 'person',
      entityId: updated.id,
      relatedCode: updated.name,
      description: `Cliente ${updated.name} actualizado`,
    })
    return updated
  },

  async setStatus(id: string, status: EntityStatus): Promise<Person> {
    return this.update(id, { status })
  },
}
