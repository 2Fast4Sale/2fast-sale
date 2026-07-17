export interface VehicleData {
  vin: string;
  marke: string;
  modell: string;
  baujahr: number;
  hubraum: string;
  kraftstoff: string;
  getriebe: string;
  kilometerstand: number;
  farbe: string;
}

export interface ProcessingState {
  step: 'upload' | 'scanning' | 'processing' | 'studio' | 'complete';
  progress: number;
  originalImage: string | null;
  processedImage: string | null;
  vehicleData: VehicleData | null;
}

export interface BrandingConfig {
  dealerName: string;
  dealerLogo: string;
  studioBackground: 'gold' | 'white-minimal' | 'blumen';
  watermark: boolean;
}

export interface ListingExport {
  autoscout24: {
    title: string;
    description: string;
    images: string[];
  };
  ebayMotors: {
    title: string;
    description: string;
    mainImage: string;
  };
  customApi: {
    vehicle: VehicleData;
    image: string;
    timestamp: string;
  };
}