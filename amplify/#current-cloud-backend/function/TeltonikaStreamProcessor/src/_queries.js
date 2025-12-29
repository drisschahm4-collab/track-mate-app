const GET_TRAME_QUERY = `
query QUERY($id: String!) {
  getTrame(id: $id) {
    id
    timestamp
    ibuttonCode
    company {
      keyedStart
    }
  }
}
`;

const GET_DEVICE_QUERY = `
query QUERY($imei: String!) {
  getDevice(imei: $imei) {
    vehicle {
      immat
      company {
        id
      }
      brand {
        brandName
      }
    }
  }
}
`;

const UPDATE_DEVICE_MUTATION = `
mutation UpdateDevice(
  $input: UpdateDeviceInput!
  $condition: ModelDeviceConditionInput
) {
  updateDevice(input: $input, condition: $condition) {
    imei
    protocolId
    sim
    messages_ttl
    device_type_id
    flespi_id
    enabled
    media_ttl
    name
    cid
    media_rotate
    messages_rotate
    createdAt
    updatedAt
    vehicleVehicleCategoryId
    vehicleBrandBrandName
    vehicleModeleId
    vehicleDeviceImei
    deviceVehicleImmat
    __typename
  }
}
`;


const CURRENT_DRIVER_QUERY = `
query QUERY($dvDVehicleImmat: String!, $timestamp: String!, $nextToken: String) {
  dvDSByDvDVehicleImmat(dvDVehicleImmat: $dvDVehicleImmat, nextToken: $nextToken, filter: {
  and:[{assignmentDate: {le: $timestamp}}, {or:[{unassignmentDate: {attributeExists: false}}, {unassignmentDate: {gt: $timestamp}}]}]}) {
    items {
      unassignmentDate
      assignmentDate
      driver {
        fullname
        firstname
        lastname
        sub
      }
    }
    nextToken
  }
}
`;

const CREATE_TRAME_QUERY = `
mutation Mutation($input: CreateTrameInput!) {
  createTrame(input: $input) {
    id
        speed
        lat
        lng
        address
        azimut
        immobilisation
        timestamp
        state
        fuel
        ibuttonCode
        companyId
        driverFullName
        vehicleBrandName
        companyTramesId
        company {
          id
          name
          siret
          address
          postalCode
          city
          countryCode
          contact
          email
          mobile
          phone
          fax
          creationDate
          subscriptionDate
          keyedStart
        
          __typename
        }
        driver {
          sub
          firstname
          lastname
          fullname
          birthDate
          drivingLicenseNumber
          drivingLicenseType
          job
          hiringDate
          comment
          driverKey
          email
          mobile
          lastModificationDate
          code
          address
          agencyId
          cdc
          pdm
          nni
          companyDriversId
        
          __typename
        }
       vehicle {
          immat
          code_certificat_qualite_air
      emissions
          AWN_niveau_de_bruit_au_ralenti
          AWN_consommation_ex_urbaine
          AWN_consommation_urbaine
          AWN_max_speed
          AWN_emission_co_2_prf
          AWN_depollution
          AWN_date_cg
          AWN_collection
          AWN_segment
          AWN_type_frein
          AWN_group
          AWN_label
          AWN_genre
      dateMiseEnCirculation
      puissanceFiscale
      puissanceDin
      energie
      boiteVitesse
      couleur
      carrosserie
      ad_blue
      ad_green
      depollution
      cl_environ_prf
      marque
      marque_id
      modele_id
      version
      VIN
      k_type
      type_mine
      AWN_url_image
      AWN_model_image
          year
          fuelType
          consumption
          maxSpeed
          seatCount
          icon
          kilometerage
          kilometerPrice
          kilometerageStart
          kilometerageDay
          kilometerageLastUpdate
          timeRunning
          counterValue
          co2
          lastModificationDate
          rollingTimeStart
          rollingTimeDay
          locations
          installationPrecautions
          code
          gefcoSend
          tankCapacity
          canMileage
          companyVehiclesId
          # createdAt
          # updatedAt
          vehicleVehicleCategoryId
          vehicleBrandBrandName
          vehicleModeleId
          vehicleDeviceImei
          __typename
        }
      
        trameDriverSub
        trameVehicleImmat
        __typename
  }
}
`;

const UPDATE_TRAME_QUERY = `
mutation Mutation($input: UpdateTrameInput!) {
  updateTrame(input: $input) {
     id
        speed
        lat
        lng
        address
        azimut
        immobilisation
        timestamp
        state
        fuel
        ibuttonCode
        companyId
        driverFullName
        vehicleBrandName
        companyTramesId
        company {
          id
          name
          siret
          address
          postalCode
          city
          countryCode
          contact
          email
          mobile
          phone
          fax
          creationDate
          subscriptionDate
          keyedStart
          # createdAt
          # updatedAt
          __typename
        }
        driver {
          sub
          firstname
          lastname
          fullname
          birthDate
          drivingLicenseNumber
          drivingLicenseType
          job
          hiringDate
          comment
          driverKey
          email
          mobile
          lastModificationDate
          code
          address
          agencyId
          cdc
          pdm
          nni
          companyDriversId
          # createdAt
          # updatedAt
          __typename
        }
        vehicle {
          immat
          code_certificat_qualite_air
      emissions
          AWN_niveau_de_bruit_au_ralenti
          AWN_consommation_ex_urbaine
          AWN_consommation_urbaine
          AWN_max_speed
          AWN_emission_co_2_prf
          AWN_depollution
          AWN_date_cg
          AWN_collection
          AWN_segment
          AWN_type_frein
          AWN_group
          AWN_label
          AWN_genre
      dateMiseEnCirculation
      puissanceFiscale
      puissanceDin
      energie
      boiteVitesse
      couleur
      carrosserie
      ad_blue
      ad_green
      depollution
      cl_environ_prf
      marque
      marque_id
      modele_id
      version
      VIN
      k_type
      type_mine
      AWN_url_image
      AWN_model_image
          year
          fuelType
          consumption
          maxSpeed
          seatCount
          icon
          kilometerage
          kilometerPrice
          kilometerageStart
          kilometerageDay
          kilometerageLastUpdate
          timeRunning
          counterValue
          co2
          lastModificationDate
          rollingTimeStart
          rollingTimeDay
          locations
          installationPrecautions
          code
          gefcoSend
          tankCapacity
          canMileage
          companyVehiclesId
          # createdAt
          # updatedAt
          vehicleVehicleCategoryId
          vehicleBrandBrandName
          vehicleModeleId
          vehicleDeviceImei
          __typename
        }
        processor
        createdAt
        updatedAt
        trameDriverSub
        trameVehicleImmat
        __typename
  }
}
`;

const GET_DRIVER_BY_KEY_QUERY = `
query Query($driverKey: String!) {
  driversByDriverKey(driverKey: $driverKey) {
    items {
      sub
      fullname
      firstname
      lastname
    }
  }
}
`;

export {
  GET_TRAME_QUERY,
  GET_DEVICE_QUERY,
  UPDATE_DEVICE_MUTATION,
  CURRENT_DRIVER_QUERY,
  CREATE_TRAME_QUERY,
  UPDATE_TRAME_QUERY,
  GET_DRIVER_BY_KEY_QUERY
}



