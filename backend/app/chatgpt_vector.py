"""
ChatGPT Vector Store Service for DFS App

This service provides functionality to:
1. Create vector stores in ChatGPT
2. Upload files (CSV, PDF, etc.) to vector stores
3. Perform chat queries with file search capabilities

Requires OPENAI_API_KEY environment variable to be set.
"""

import os
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging

try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    raise ImportError("openai package is required. Install with: pip install openai")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChatGPTVectorService:
    """
    Service for managing ChatGPT vector stores and file-based chat queries.
    Scoped per user with naming convention: [username]-dfs
    """
    
    def __init__(self, username: str, api_key: Optional[str] = None):
        """
        Initialize the ChatGPT Vector Service for a specific user.
        
        Args:
            username: Username for scoping vector stores (e.g., "tvenis")
            api_key: OpenAI API key. If not provided, will use OPENAI_API_KEY env var.
        """
        self.username = username
        self.store_name = f"{username}-dfs"
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass api_key parameter.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.async_client = AsyncOpenAI(api_key=self.api_key)
        self.vector_store_id: Optional[str] = None
        
    async def create_vector_store(self, name: Optional[str] = None) -> str:
        """
        Create a new vector store in ChatGPT for the user.
        
        Args:
            name: Name for the vector store. If not provided, uses {username}-dfs format.
            
        Returns:
            Vector store ID
        """
        try:
            store_name = name or self.store_name
            logger.info(f"Creating vector store for user {self.username}: {store_name}")
            vector_store = await self.async_client.vector_stores.create(name=store_name)
            self.vector_store_id = vector_store.id
            logger.info(f"Vector store created with ID: {vector_store.id}")
            return vector_store.id
        except Exception as e:
            logger.error(f"Error creating vector store: {e}")
            raise
    
    async def upload_file(self, file_path: str, vector_store_id: Optional[str] = None) -> str:
        """
        Upload a file to the vector store.
        
        Args:
            file_path: Path to the file to upload (CSV, PDF, etc.)
            vector_store_id: Vector store ID. If not provided, uses the stored ID.
            
        Returns:
            File ID
        """
        try:
            vs_id = vector_store_id or self.vector_store_id
            if not vs_id:
                raise ValueError("No vector store ID provided. Create a vector store first.")
            
            file_path_obj = Path(file_path)
            if not file_path_obj.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            logger.info(f"Uploading file: {file_path} to vector store: {vs_id}")
            
            # Step 1: Upload file to OpenAI storage
            with open(file_path, "rb") as f:
                file_obj = await self.async_client.files.create(
                    file=f,
                    purpose="assistants"
                )
            
            logger.info(f"File uploaded to OpenAI storage. File ID: {file_obj.id}")
            
            # Step 2: Attach file to vector store
            try:
                vector_store_file = await self.async_client.vector_stores.files.create(
                    vector_store_id=vs_id,
                    file_id=file_obj.id
                )
                logger.info(f"File attached to vector store. Vector Store File ID: {vector_store_file.id}")
            except Exception as attach_error:
                logger.warning(f"File uploaded but attachment may have failed: {attach_error}")
                # Return the file ID anyway since the file was uploaded
                return file_obj.id
            
            return file_obj.id
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise
    
    async def chat_with_file_search(
        self, 
        query: str, 
        vector_store_id: Optional[str] = None,
        model: str = "gpt-4o-mini"
    ) -> str:
        """
        Perform a chat query with file search capabilities.
        
        Args:
            query: The user's question/query
            vector_store_id: Vector store ID. If not provided, uses the stored ID.
            model: OpenAI model to use for the chat
            
        Returns:
            Assistant's response
        """
        try:
            vs_id = vector_store_id or self.vector_store_id
            if not vs_id:
                raise ValueError("No vector store ID provided. Create a vector store first.")
            
            logger.info(f"Performing chat query with file search: {query}")
            
            response = await self.async_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                tools=[{"type": "file_search"}],
                tool_choice="required",
                tool_resources={
                    "file_search": {
                        "vector_store_ids": [vs_id]
                    }
                }
            )
            
            assistant_response = response.choices[0].message.content
            logger.info("Chat query completed successfully")
            return assistant_response
            
        except Exception as e:
            logger.error(f"Error in chat with file search: {e}")
            raise
    
    async def list_vector_stores(self) -> List[Dict[str, Any]]:
        """
        List all vector stores.
        
        Returns:
            List of vector store information
        """
        try:
            vector_stores = await self.async_client.vector_stores.list()
            return [
                {
                    "id": vs.id,
                    "name": vs.name,
                    "status": vs.status,
                    "file_counts": vs.file_counts,
                    "created_at": vs.created_at
                }
                for vs in vector_stores.data
            ]
        except Exception as e:
            logger.error(f"Error listing vector stores: {e}")
            raise
    
    async def find_user_vector_store(self) -> Optional[Dict[str, Any]]:
        """
        Find the user's existing vector store.
        
        Returns:
            Vector store information if found, None otherwise
        """
        try:
            vector_stores = await self.async_client.vector_stores.list()
            for vs in vector_stores.data:
                if vs.name == self.store_name:
                    store_info = {
                        "id": vs.id,
                        "name": vs.name,
                        "status": vs.status,
                        "file_counts": vs.file_counts,
                        "created_at": vs.created_at
                    }
                    self.vector_store_id = vs.id
                    logger.info(f"Found existing vector store for user {self.username}: {vs.id}")
                    return store_info
            
            logger.info(f"No existing vector store found for user {self.username}")
            return None
            
        except Exception as e:
            logger.error(f"Error finding user vector store: {e}")
            raise
    
    async def get_or_create_user_vector_store(self) -> str:
        """
        Get existing user vector store or create a new one.
        
        Returns:
            Vector store ID
        """
        try:
            # Try to find existing store first
            existing_store = await self.find_user_vector_store()
            if existing_store:
                return existing_store["id"]
            
            # Create new store if none exists
            logger.info(f"No existing vector store found for user {self.username}, creating new one")
            return await self.create_vector_store()
            
        except Exception as e:
            logger.error(f"Error getting or creating user vector store: {e}")
            raise
    
    async def delete_vector_store(self, vector_store_id: Optional[str] = None) -> bool:
        """
        Delete a vector store.
        
        Args:
            vector_store_id: Vector store ID. If not provided, uses the stored ID.
            
        Returns:
            True if successful
        """
        try:
            vs_id = vector_store_id or self.vector_store_id
            if not vs_id:
                raise ValueError("No vector store ID provided.")
            
            await self.async_client.vector_stores.delete(vs_id)
            logger.info(f"Vector store deleted: {vs_id}")
            
            if vs_id == self.vector_store_id:
                self.vector_store_id = None
                
            return True
            
        except Exception as e:
            logger.error(f"Error deleting vector store: {e}")
            raise


# Convenience functions for easy usage
async def create_user_dfs_vector_store(username: str) -> str:
    """
    Convenience function to create a user-specific DFS vector store.
    
    Args:
        username: Username (e.g., "tvenis")
        
    Returns:
        Vector store ID
    """
    service = ChatGPTVectorService(username)
    return await service.create_vector_store()


async def get_user_dfs_vector_store(username: str) -> str:
    """
    Convenience function to get or create a user's DFS vector store.
    
    Args:
        username: Username (e.g., "tvenis")
        
    Returns:
        Vector store ID
    """
    service = ChatGPTVectorService(username)
    return await service.get_or_create_user_vector_store()


async def upload_user_dfs_file(username: str, file_path: str, vector_store_id: Optional[str] = None) -> str:
    """
    Convenience function to upload a DFS-related file to user's vector store.
    
    Args:
        username: Username (e.g., "tvenis")
        file_path: Path to the file to upload
        vector_store_id: Vector store ID. If not provided, will find user's store.
        
    Returns:
        File ID
    """
    service = ChatGPTVectorService(username)
    if not vector_store_id:
        vector_store_id = await service.get_or_create_user_vector_store()
    return await service.upload_file(file_path, vector_store_id)


async def query_user_dfs_data(username: str, query: str, vector_store_id: Optional[str] = None, model: str = "gpt-4o-mini") -> str:
    """
    Convenience function to query user's DFS data with file search.
    
    Args:
        username: Username (e.g., "tvenis")
        query: The user's question about DFS data
        vector_store_id: Vector store ID. If not provided, will find user's store.
        model: OpenAI model to use
        
    Returns:
        Assistant's response
    """
    service = ChatGPTVectorService(username)
    if not vector_store_id:
        vector_store_id = await service.get_or_create_user_vector_store()
    return await service.chat_with_file_search(query, vector_store_id, model)


# Example usage
async def main():
    """
    Example usage of the ChatGPT Vector Service with user scoping.
    """
    try:
        username = "tvenis"  # Example username
        
        # Initialize service for user
        service = ChatGPTVectorService(username)
        
        # Get or create user's vector store
        vs_id = await service.get_or_create_user_vector_store()
        print(f"User {username} vector store ID: {vs_id}")
        
        # Upload a file (example - adjust path as needed)
        # file_id = await service.upload_file("week2_ownership.csv", vs_id)
        # print(f"Uploaded file: {file_id}")
        
        # Query the data
        # response = await service.chat_with_file_search(
        #     "Who are the safest cash TEs from my uploads?",
        #     vs_id
        # )
        # print(f"Response: {response}")
        
        # Example using convenience functions
        # vs_id = await get_user_dfs_vector_store("tvenis")
        # file_id = await upload_user_dfs_file("tvenis", "week2_ownership.csv")
        # response = await query_user_dfs_data("tvenis", "Who are the safest cash TEs from my uploads?")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    asyncio.run(main())
